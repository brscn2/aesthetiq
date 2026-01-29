import { NextRequest, NextResponse } from "next/server"
import OpenAI, { toFile } from "openai"
import fs from "fs"
import path from "path"
import { createWriteStream } from "fs"
import { pipeline } from "stream/promises"

const openai = new OpenAI({
  apiKey: process.env.OPENAI_KEY,
})

interface TryOnRequest {
  personImageUrl?: string
  personImageFile?: string // base64 encoded image
  clothingImages?: string[] // Array of image URLs (for multiple items)
  singleClothingItem?: string // Single clothing item URL (for individual item try-on)
}

// Helper function to get MIME type from file extension
function getMimeType(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase()
  switch (ext) {
    case '.png':
      return 'image/png'
    case '.jpg':
    case '.jpeg':
      return 'image/jpeg'
    case '.webp':
      return 'image/webp'
    default:
      return 'image/jpeg' // default fallback
  }
}

// Helper to download remote image to temp file and return file path
async function downloadImageToTemp(imagePath: string, tempDir: string, index: number): Promise<string> {
  if (imagePath.startsWith('http')) {
    // Download remote image to temp file
    const response = await fetch(imagePath)
    if (!response.ok) throw new Error(`Failed to fetch remote image: ${imagePath}`)
    
    const extension = imagePath.includes('.png') ? '.png' : '.jpg'
    const tempFilePath = path.join(tempDir, `temp_image_${index}${extension}`)
    
    const fileStream = createWriteStream(tempFilePath)
    await pipeline(response.body as any, fileStream)
    
    return tempFilePath
  } else if (imagePath.startsWith('data:image')) {
    // Base64 data URL - save to temp file
    const matches = imagePath.match(/^data:image\/(png|jpeg|jpg);base64,(.+)$/)
    if (!matches) throw new Error('Invalid base64 image data URL')
    
    const extension = matches[1] === 'png' ? '.png' : '.jpg'
    const base64 = matches[2]
    const buffer = Buffer.from(base64, 'base64')
    
    const tempFilePath = path.join(tempDir, `temp_image_${index}${extension}`)
    fs.writeFileSync(tempFilePath, buffer)
    
    return tempFilePath
  } else {
    // Local file
    const cleanPath = imagePath.startsWith('/') ? imagePath.slice(1) : imagePath
    return path.join(process.cwd(), 'public', cleanPath)
  }
}

// Helper to clean up temp files
function cleanupTempFiles(tempDir: string) {
  try {
    if (fs.existsSync(tempDir)) {
      const files = fs.readdirSync(tempDir)
      for (const file of files) {
        if (file.startsWith('temp_image_')) {
          fs.unlinkSync(path.join(tempDir, file))
        }
      }
      // Only remove directory if it's empty and we created it
      const remainingFiles = fs.readdirSync(tempDir)
      if (remainingFiles.length === 0) {
        fs.rmdirSync(tempDir)
      }
    }
  } catch (error) {
    console.error('Error cleaning up temp files:', error)
  }
}

export async function POST(request: NextRequest) {
  const tempDir = path.join(process.cwd(), 'temp_images')
  
  try {
    const body: TryOnRequest = await request.json()

    // Validate input - need either personImageUrl or personImageFile
    if (!body.personImageUrl && !body.personImageFile) {
      return NextResponse.json(
        { error: "Person image is required (either URL or uploaded file)" },
        { status: 400 }
      )
    }

    // Validate clothing items - need either clothingImages array or singleClothingItem
    const hasClothingImages = body.clothingImages && body.clothingImages.length > 0
    const hasSingleItem = body.singleClothingItem
    
    if (!hasClothingImages && !hasSingleItem) {
      return NextResponse.json(
        { error: "At least one clothing item is required" },
        { status: 400 }
      )
    }

    console.log('Virtual try-on request:', {
      personImageUrl: body.personImageUrl,
      hasPersonImageFile: !!body.personImageFile,
      clothingImages: body.clothingImages,
      singleClothingItem: body.singleClothingItem
    })

    // Create temp directory if it doesn't exist
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true })
    }

    // Handle person image - either from URL or uploaded file
    let personImagePath: string
    if (body.personImageFile) {
      // Handle uploaded base64 image
      const personImageData = `data:image/jpeg;base64,${body.personImageFile}`
      personImagePath = await downloadImageToTemp(personImageData, tempDir, 0)
    } else {
      // Handle URL
      personImagePath = await downloadImageToTemp(body.personImageUrl!, tempDir, 0)
    }

    // Handle clothing items
    let clothingImagePaths: string[] = []
    if (hasSingleItem) {
      // Single clothing item
      clothingImagePaths = [await downloadImageToTemp(body.singleClothingItem!, tempDir, 1)]
    } else {
      // Multiple clothing items
      clothingImagePaths = await Promise.all(
        body.clothingImages!.map((url, index) => downloadImageToTemp(url, tempDir, index + 1))
      )
    }

    console.log('Downloaded images:', {
      personImagePath,
      clothingImagePaths
    })

    // Prepare image files using toFile utility to ensure proper MIME types
    const imageFiles = []
    
    // Add person image first
    const personFile = await toFile(fs.createReadStream(personImagePath), path.basename(personImagePath), {
      type: getMimeType(personImagePath)
    })
    imageFiles.push(personFile)
    
    // Add clothing images
    for (const clothingPath of clothingImagePaths) {
      const clothingFile = await toFile(fs.createReadStream(clothingPath), path.basename(clothingPath), {
        type: getMimeType(clothingPath)
      })
      imageFiles.push(clothingFile)
    }

    // Build a prompt based on the type of try-on
    const itemCount = clothingImagePaths.length
    const itemType = itemCount === 1 ? "clothing item" : "clothing items"
    
    let prompt: string
    if (hasSingleItem) {
      prompt = `Create a photorealistic virtual try-on by seamlessly having the person in the first image wear the clothing item from the second image.

Instructions:
- Replace or add ONLY the specific clothing piece, keeping everything else identical
- Maintain the person's exact face, skin tone, body proportions, and pose
- Ensure the new clothing fits naturally on their body with realistic shadows, wrinkles, and fabric draping
- Match the lighting and color temperature of the original photo
- Preserve the background and overall composition
- Make the clothing appear as if it was originally worn in the photo
- The final image should be indistinguishable from a real photograph of the person wearing this item.`
    } else {
      prompt = `Create a photorealistic virtual try-on by seamlessly dressing the person in the first image with the provided ${itemType}.

Instructions:
- Replace ONLY the clothing with the new ${itemType}, keeping everything else identical
- Maintain the person's exact face, skin tone, body proportions, and pose
- Ensure the new clothing fits naturally on their body with realistic shadows, wrinkles, and fabric draping
- Match the lighting and color temperature of the original photo
- Preserve the background and overall composition
- Make the clothing appear as if it was originally worn in the photo
- For multiple items: coordinate them as a cohesive outfit
- Result should look like a professional fashion photograph, not a digital overlay

The final image should be indistinguishable from a real photograph of the person wearing these ${itemType}.`
    }

    console.log('Calling OpenAI images.edit API with', imageFiles.length, 'images...')

    // Call OpenAI's image edit endpoint with correct format
    const result = await openai.images.edit({
      model: "gpt-image-1",
      image: imageFiles,
      prompt,
      input_fidelity: "high",
      quality: "low"
    })

    console.log('OpenAI API response received')

    // Get the base64 image
    const image_base64 = result.data?.[0]?.b64_json

    if (!image_base64) {
      console.error('No image data in response:', result)
      return NextResponse.json(
        { error: "Failed to generate virtual try-on image" },
        { status: 500 }
      )
    }

    console.log('Virtual try-on generated successfully')

    return NextResponse.json({
      success: true,
      imageBase64: image_base64,
    })
  } catch (error: any) {
    console.error("Virtual try-on error:", error)
    
    // Handle specific OpenAI errors
    if (error.status === 400) {
      return NextResponse.json(
        { error: `OpenAI API error: ${error.message}` },
        { status: 400 }
      )
    }
    
    if (error.status === 401) {
      return NextResponse.json(
        { error: "Invalid OpenAI API key" },
        { status: 500 }
      )
    }
    
    return NextResponse.json(
      {
        error: error.message || "Failed to generate virtual try-on",
      },
      { status: 500 }
    )
  } finally {
    // Clean up temp files
    cleanupTempFiles(tempDir)
  }
}