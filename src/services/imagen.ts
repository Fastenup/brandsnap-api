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
        model: 'gemini-2.5-flash-image-generation',
        contents: prompt + ` (Variation Seed: ${Date.now()})`,
        config: {
          responseModalities: ['Text', 'Image'],
        }
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
  blueprint: `Technical blueprint style app icon:
- Deep navy blue background (#0a1628)
- Single geometric symbol in cyan (#00ffff) or white line art
- Circuit board or schematic aesthetic
- Crisp technical precision, engineer's drawing quality
- Glowing edges on the symbol`,

  brutalism: `Neo-brutalist app icon:
- Pure black or white background
- One bold geometric shape with thick black outline (4px+)
- Single neon accent color (lime, magenta, or cyan)
- Raw, aggressive, anti-corporate aesthetic
- Intentionally imperfect but striking`,

  isometric: `Isometric 3D app icon:
- Single isometric cube, object, or abstract 3D shape
- Soft ambient shadows, clay/plastic render style
- 3-4 harmonious colors only
- Playful and modern like Notion or Slack icons
- Clean vector 3D look, not photorealistic`,

  fluid: `Glass-morphism app icon:
- Flowing organic glass or liquid shape
- Iridescent gradient with light refraction
- Soft ethereal glow, premium gemstone quality
- Translucent layers with depth
- Aurora-like color shifts`,

  collage: `Mixed media collage app icon:
- 2-3 layered paper-cut shapes with visible edges
- Textured surfaces (paper grain, fabric)
- Vintage meets modern aesthetic
- Warm tactile handcraft feel
- Slight shadow between layers`,

  explainer: `Flat vector app icon:
- Single clean geometric shape or simple illustration
- Consistent 2-3px stroke weight
- Maximum 2 solid colors
- Friendly, approachable, corporate SaaS style
- Perfect for small sizes`,

  minimal: `Ultra-minimal app icon:
- Single pure geometric form (circle, square, triangle, or abstract)
- Maximum negative space
- Monochrome or 2 colors maximum
- Apple/Muji level simplicity
- Perfect symmetry or intentional golden ratio`,

  gradient: `Aurora gradient app icon:
- Rounded square or circle shape
- Smooth mesh gradient fill (2-3 colors blending)
- iOS/macOS Big Sur aesthetic
- Soft, modern, premium feel
- Subtle inner glow or depth`,

  geometric: `Geometric pattern app icon:
- Interlocking geometric shapes or tessellation
- Bold color blocking within shapes
- Mathematical precision, perfect symmetry
- Bauhaus or sacred geometry influence
- Works as single color silhouette`,

  retro: `Retro vintage app icon:
- Warm 70s-80s palette (orange, brown, teal, cream)
- Rounded badge, emblem, or sun-ray shape
- Subtle halftone dots or grain texture
- Nostalgic warmth, record sleeve aesthetic
- Thick rounded corners`,
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

  // Derive a meaningful icon concept from the brand
  const iconIdea = brandAnalysis.iconConcept || 
    (brandAnalysis.industry?.toLowerCase().includes('verification') ? 'checkmark shield' :
     brandAnalysis.industry?.toLowerCase().includes('finance') ? 'abstract coin or chart' :
     brandAnalysis.industry?.toLowerCase().includes('health') ? 'heart or plus symbol' :
     brandAnalysis.industry?.toLowerCase().includes('tech') ? 'abstract circuit or node' :
     brandAnalysis.industry?.toLowerCase().includes('social') ? 'connected dots or speech' :
     'abstract geometric mark')

  const prompt = `Create a PREMIUM app icon for "${brandAnalysis.brandName}" - a ${brandAnalysis.industry || 'technology'} brand.

WHAT THIS BRAND DOES: ${brandAnalysis.summary || 'Modern digital service'}

ICON CONCEPT: Design a symbol that represents "${iconIdea}" - but make it UNIQUE and MEMORABLE, not generic.

BRAND COLORS (use these):
- Primary: ${primaryColor}
- Secondary: ${secondaryColor}

VISUAL STYLE:
${stylePrompt}

ABSOLUTE REQUIREMENTS:
1. Square 1:1 format, will display at 16px to 512px
2. SINGLE focal element - one symbol, not multiple objects
3. Must pass the "squint test" - recognizable when blurry
4. Strong silhouette that works in pure black
5. Centered with ~15% padding on all sides
6. NO text, NO letters, NO numbers, NO words
7. NO generic symbols (no gears, lightbulbs, handshakes, globes, chat bubbles)
8. UNIQUE to this specific brand - would be recognized as "${brandAnalysis.brandName}"

TECHNICAL QUALITY:
- Crisp vector-like edges (not fuzzy or painterly)  
- Professional App Store / Google Play quality
- Would look perfect on iPhone home screen
- High contrast for visibility at small sizes`

  const maxRetries = 3
  let lastError: Error | null = null

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      console.log(`[Imagen] Generating favicon, attempt ${attempt + 1}`)
      
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image-generation',
        contents: prompt + ` (Variation Seed: ${Date.now()})`,
        config: {
          responseModalities: ['Text', 'Image'],
        }
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
