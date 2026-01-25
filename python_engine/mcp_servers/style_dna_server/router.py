"""Style DNA MCP server router."""
import logging
from fastapi import APIRouter, HTTPException, Query

from mcp_servers.style_dna_server import tools
from mcp_servers.style_dna_server.schemas import (
    GetColorSeasonResponse,
    GetColorSeasonRequest,
    GetRecommendedColorsResponse,
    GetRecommendedColorsRequest,
    GetStyleArchetypeResponse,
    GetStyleArchetypeRequest,
    GetStyleDNAResponse,
    GetStyleDNARequest,
)

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get("/health")
async def health():
    return {"status": "healthy", "domain": "style-dna"}


@router.post("/tools/get_style_dna", response_model=GetStyleDNAResponse, operation_id="get_style_dna")
async def get_style_dna(req: GetStyleDNARequest):
    """Get complete style DNA (combines StyleProfile + ColorAnalysis)."""
    dna = await tools.get_style_dna(req.user_id)
    if not dna:
        raise HTTPException(status_code=404, detail="Style DNA not found")
    return GetStyleDNAResponse(style_dna=dna)


@router.post("/tools/get_color_season", response_model=GetColorSeasonResponse, operation_id="get_color_season")
async def get_color_season(req: GetColorSeasonRequest):
    """Get color season, contrast level, and undertone from ColorAnalysis."""
    logger.info(f"get_color_season called with user_id: {req.user_id}")
    season = await tools.get_color_season(req.user_id)
    contrast = await tools.get_contrast_level(req.user_id)
    undertone = await tools.get_undertone(req.user_id)
    logger.info(f"get_color_season result: season={season}, contrast={contrast}, undertone={undertone}")
    return GetColorSeasonResponse(
        user_id=req.user_id,
        color_season=season,
        contrast_level=contrast,
        undertone=undertone,
    )


@router.post("/tools/get_style_archetype", response_model=GetStyleArchetypeResponse, operation_id="get_style_archetype")
async def get_style_archetype(req: GetStyleArchetypeRequest):
    """Get style archetype and sliders from StyleProfile."""
    archetype = await tools.get_style_archetype(req.user_id)
    sliders = await tools.get_style_sliders(req.user_id)
    return GetStyleArchetypeResponse(
        user_id=req.user_id,
        archetype=archetype,
        sliders=sliders,
    )


@router.post("/tools/get_recommended_colors", response_model=GetRecommendedColorsResponse, operation_id="get_recommended_colors")
async def get_recommended_colors(req: GetRecommendedColorsRequest):
    """Get recommended colors based on color season + user's personalized palette."""
    logger.info(f"get_recommended_colors called with user_id: {req.user_id}")
    colors = await tools.get_recommended_colors(req.user_id)
    palette = await tools.get_user_palette(req.user_id)
    logger.info(f"get_recommended_colors result: colors={len(colors) if colors else 0}, palette={len(palette) if palette else 0}")
    return GetRecommendedColorsResponse(
        user_id=req.user_id,
        colors=colors,
        palette=palette,
    )


@router.get("/test/style-dna")
async def test_style_dna(user_id: str = Query(...)):
    """Test endpoint to fetch complete style DNA."""
    dna = await tools.get_style_dna(user_id)
    if not dna:
        raise HTTPException(status_code=404, detail="Style DNA not found")
    return {
        "user_id": user_id,
        "color_season": dna.color_season,
        "archetype": dna.archetype,
        "contrast_level": dna.contrast_level,
        "undertone": dna.undertone,
        "sliders": dna.sliders,
        "favorite_brands": dna.favorite_brands,
        "budget_range": dna.budget_range,
        "raw_style_profile": dna.raw_style_profile,
        "raw_color_analysis": dna.raw_color_analysis,
    }
