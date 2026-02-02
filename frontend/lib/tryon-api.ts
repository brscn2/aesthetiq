import axios from "axios"

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api"

export async function uploadTryonAvatar(token: string, avatarImage: File): Promise<string> {
  const formData = new FormData()
  formData.append("avatar", avatarImage)

  const response = await axios.post(`${API_BASE_URL}/users/me/tryon-avatar`, formData, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })

  return response.data.url
}

export async function tryOnClothing(
  token: string,
  clothingImageUrl: string,
  avatarImage: File | null,
  useSavedAvatar: boolean = false
): Promise<Blob> {
  const formData = new FormData()
  formData.append("clothing_image_url", clothingImageUrl)
  formData.append("use_saved_avatar", useSavedAvatar.toString())
  
  if (!useSavedAvatar && avatarImage) {
    formData.append("avatar_image", avatarImage)
  }

  const response = await axios.post(`${API_BASE_URL}/tryon/try-on`, formData, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
    responseType: "blob",
    timeout: 300000, // 5 minutes timeout for LightX async processing
  })

  return response.data
}
