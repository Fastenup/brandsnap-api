/**
 * Image Generation Service using Gemini Image Models
 */

import { GoogleGenAI } from '@google/genai'
import type { Style, Platform, BrandAnalysis } from '../types'

const getClient = () => {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY not configured')
  }
  return new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })
}

const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

const STYLE_PROMPTS: Record<Style, string> = {
  blueprint: `Technical blueprint schematic style:
- Dark navy blue background (#0a1628) with subtle grid lines
- White or cyan technical line drawings
- Engineering annotations, circuit-like patterns
- CAD drawing or patent application aesthetic
- Precise geometric shapes, clean lines
- NO photorealism`,

  brutalism: `Neo-brutalist web design style:
- Stark black and white base with bold neon accent color
- Thick black borders (4-8px), sharp 90° corners
- Raw, industrial, intentionally "ugly-beautiful"
- High contrast, no gradients
- Geometric blocks, overlapping shapes
- Punk zine aesthetic`,

  isometric: `Isometric 3D illustration style:
- True isometric perspective (30° angles)
- Detailed miniature 3D world or objects
- Soft ambient occlusion shadows
- Clean vector-like 3D rendering
- Limited color palette (4-5 colors)
- Playful like Slack or Notion illustrations`,

  fluid: `Ethereal glass-morphism style:
- Flowing liquid or glass-like organic shapes
- Iridescent gradients, light refractions
- Dreamy, soft-focus atmosphere
- Transparent overlapping layers
- Subtle grain texture for depth
- Aurora-like color blending`,

  collage: `Mixed media digital collage style:
- Layered paper-cut textures with visible edges
- Mix of photography fragments and illustrations
- Intentional overlap and visual noise
- Vintage + modern elements combined
- Tactile, handmade, scrapbook feel
- Rich textures: paper grain, fabric`,

  explainer: `Flat vector illustration style:
- Clean minimal vector shapes, no gradients
- Consistent 2-3px stroke weights
- Limited palette: 3-4 harmonious colors
- Clear visual hierarchy with whitespace
- Friendly, like a SaaS landing page
- Corporate Memphis style`,

  minimal: `Ultra-minimal design style:
- Maximum whitespace or single color field
- One focal element, perfectly placed
- Monochromatic or 2 colors only
- No decoration, no texture, no gradients
- Geometric purity: circles, lines, squares
- Apple or Muji aesthetic`,

  gradient: `Aurora gradient design style:
- Smooth flowing color gradients
- 3-4 colors blending seamlessly
- Mesh gradient or aurora effect
- Subtle grain texture overlay
- No hard edges, everything soft
- iOS wallpaper or Stripe aesthetic`,

  geometric: `Geometric pattern design style:
- Repeating or interlocking shapes
- Tessellations, polygons, sacred geometry
- Bold color blocking within shapes
- Mathematical precision, symmetry
- Op-art or Bauhaus influence
- Architectural pattern aesthetic`,

  retro: `Retro vintage 70s-80s style:
- Orange, brown, teal, cream palette
- Halftone dots, sun rays, rounded corners
- Grain, scratches, aged paper texture
- Nostalgic, warm, analog feeling
- Vintage travel poster aesthetic
- Record sleeve or movie poster vibe`,
}

const PLATFORM_CONFIG: Record<Platform, { width: number; height: number; aspectRatio: string }> = {
  twitter: { width: 1500, height: 500, aspectRatio: '3:1' },
  linkedin: { width: 1584, height: 396, aspectRatio: '4:1' },
  youtube: { width: 2560, height: 1440, aspectRatio: '16:9' },
  facebook: { width: 820, height: 312, aspectRatio: '8:3' },
  og: { width: 1200, height: 630, aspectRatio: '1200:630' },
}

/**
 * Generate banner using Gemini image models
 */
export async function generateBannerWithImagen(
  brandAnalysis: BrandAnalysis,
  platform: Platform,
  style: Style
): Promise<string> {
  const ai = getClient()
  const config = PLATFORM_CONFIG[platform]
  const stylePrompt = STYLE_PROMPTS[style] || STYLE_PROMPTS.minimal
  const colors = brandAnalysis.brandColors.slice(0, 4).join(', ')

  const prompt = `Create a professional banner/header background image.

BRAND: ${brandAnalysis.brandName}
DESCRIPTION: ${brandAnalysis.summary || 'Modern brand'}
BRAND COLORS: ${colors || '#3b82f6, #ffffff'}

STYLE REQUIREMENTS:
${stylePrompt}

COMPOSITION:
- Wide landscape format (${config.aspectRatio} aspect ratio)
- Fill the entire canvas
- Create visual interest across the width
- Leave some space in center for potential text overlay

CRITICAL RULES:
- NO text, words, letters, or logos whatsoever
- NO human faces or recognizable people
- Use the brand colors prominently
- Make it visually striking and memorable
- Professional quality, suitable for a company header`

  const maxRetries = 3
  let lastError: Error | null = null

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      console.log(`[Imagen] Generating ${platform} banner, attempt ${attempt + 1}`)
      
      const response = await ai.models.generateContent({
        model: 'gemini-3-pro-image-preview',
        contents: {
          parts: [{ text: prompt + ` (Variation Seed: ${Date.now()})` }]
        },
        config: {
          imageConfig: {
            aspectRatio: config.aspectRatio,
            imageSize: '4K'
          }
        } as any
      })

      for (const part of response.candidates?.[0]?.content?.parts || []) {
        if ((part as any).inlineData) {
          console.log(`[Imagen] Successfully generated ${platform} banner`)
          return `data:image/png;base64,${(part as any).inlineData.data}`
        }
      }
      
      throw new Error('No image data in response')
    } catch (error: any) {
      lastError = error
      console.error(`[Imagen] Attempt ${attempt + 1} failed:`, error.message)
      
      if (error.status === 429 || error.status === 503 || error.message?.includes('overloaded')) {
        const waitTime = Math.pow(2, attempt + 1) * 2000
        console.log(`[Imagen] Waiting ${waitTime}ms before retry...`)
        await wait(waitTime)
        continue
      }
      break
    }
  }
  
  console.error(`[Imagen] All attempts failed for ${platform}`)
  throw lastError || new Error('Image generation failed after retries')
}

const ICON_STYLE_PROMPTS: Record<Style, string> = {
  blueprint: `Technical blueprint style icon: Dark navy background, cyan/white geometric line art, circuit aesthetic`,
  brutalism: `Neo-brutalist icon: High contrast black/white with neon accent, thick bold strokes, raw geometric shape`,
  isometric: `Isometric 3D icon: Single isometric object or cube, soft shadows, clean 3D render style`,
  fluid: `Glass-morphism fluid icon: Flowing organic glass-like shape, iridescent gradient fill, ethereal glow`,
  collage: `Mixed media collage icon: Layered paper-cut aesthetic, 2-3 overlapping textured shapes`,
  explainer: `Flat vector icon: Clean minimal vector shape, consistent stroke weight, 2 colors maximum`,
  minimal: `Ultra-minimal icon: Single pure geometric form, maximum negative space, monochromatic`,
  gradient: `Aurora gradient icon: Smooth flowing color gradient fill, soft rounded shape, iOS aesthetic`,
  geometric: `Geometric pattern icon: Interlocking geometric shapes, bold color blocking, Bauhaus influenced`,
  retro: `Retro vintage icon: Warm 70s-80s color palette, rounded badge or emblem shape, subtle grain`,
}

/**
 * Generate favicon/icon using Gemini image models
 */
export async function generateIconWithImagen(
  brandAnalysis: BrandAnalysis,
  style: Style
): Promise<string> {
  const ai = getClient()
  const primaryColor = brandAnalysis.brandColors[0] || '#3b82f6'
  const secondaryColor = brandAnalysis.brandColors[1] || '#ffffff'
  const concept = brandAnalysis.iconConcept || 'abstract geometric symbol'
  const stylePrompt = ICON_STYLE_PROMPTS[style] || ICON_STYLE_PROMPTS.minimal

  const prompt = `Create a high-quality app icon / favicon for "${brandAnalysis.brandName}".

BRAND CONTEXT:
- Brand: ${brandAnalysis.brandName}
- Industry: ${brandAnalysis.industry || 'technology'}
- Visual concept: ${concept}
- Primary color: ${primaryColor}
- Secondary color: ${secondaryColor}

STYLE:
${stylePrompt}

CRITICAL REQUIREMENTS:
- Square format (1:1 aspect ratio)
- Must be recognizable at 32x32 pixels
- Single iconic symbol or mark
- Use the brand colors prominently
- Strong silhouette that works in monochrome
- Centered with balanced padding
- NO text, letters, numbers, or words
- NO generic icons (no gears, lightbulbs, chat bubbles)
- Create a UNIQUE symbol for this specific brand

QUALITY:
- High resolution, crisp edges
- Professional app store quality
- Memorable and distinctive`

  const maxRetries = 3
  let lastError: Error | null = null

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      console.log(`[Imagen] Generating favicon, attempt ${attempt + 1}`)
      
      const response = await ai.models.generateContent({
        model: 'gemini-3-pro-image-preview',
        contents: {
          parts: [{ text: prompt + ` (Variation Seed: ${Date.now()})` }]
        },
        config: {
          imageConfig: {
            aspectRatio: '1:1',
            imageSize: '4K'
          }
        } as any
      })

      for (const part of response.candidates?.[0]?.content?.parts || []) {
        if ((part as any).inlineData) {
          console.log(`[Imagen] Successfully generated favicon`)
          return `data:image/png;base64,${(part as any).inlineData.data}`
        }
      }
      
      throw new Error('No icon data in response')
    } catch (error: any) {
      lastError = error
      console.error(`[Imagen] Favicon attempt ${attempt + 1} failed:`, error.message)
      
      if (error.status === 429 || error.status === 503 || error.message?.includes('overloaded')) {
        const waitTime = Math.pow(2, attempt + 1) * 2000
        console.log(`[Imagen] Waiting ${waitTime}ms before retry...`)
        await wait(waitTime)
        continue
      }
      break
    }
  }
  
  throw lastError || new Error('Favicon generation failed after retries')
}
