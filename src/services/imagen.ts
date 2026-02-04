/**
 * Image Generation Service using Google Imagen 4
 * 
 * Approach: Brand assets should convey the brand's identity, niche, and value proposition
 * through symbolism, composition, and optional text overlays.
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

// Supported aspect ratios: 1:1, 9:16, 16:9, 4:3, 3:4
const PLATFORM_ASPECT_RATIO: Record<Platform, string> = {
  twitter: '16:9',
  linkedin: '16:9',
  youtube: '16:9',
  facebook: '16:9',
  og: '16:9',
}

// Style-specific visual guides (inspired by Orbator)
const STYLE_GUIDES: Record<Style, string> = {
  blueprint: `**STYLE: ORTHOGRAPHIC BLUEPRINT / SCHEMATIC**
- Full-width technical schematic on dark engineering background (#0a1628)
- Detailed white/cyan line drawings, grid lines, measurement annotations
- Show the brand concept as exploded technical diagrams
- CAD drawing or patent application aesthetic
- NO photorealism. Precise, Technical, Architectural, Complex.`,

  brutalism: `**STYLE: NEO-BRUTALISM / WEB AESTHETIC**
- Stark contrast, heavy black borders (4px+ strokes)
- Raw unpolished look, UI elements, browser windows, retro computer aesthetics
- High saturation neon colors against stark black/white
- Glitch artifacts, system fonts used decoratively
- Raw, Honest, Retro-future, Developer-centric vibe.`,

  isometric: `**STYLE: 3D ISOMETRIC RENDER**
- Sprawling miniature 3D world or complex machinery
- Strict 30-degree isometric perspective
- Soft global illumination, soft shadows, claymorphism/plastic sheen
- Show brand ecosystem as a 3D city or factory floor
- Playful, Tech-forward, Gamified, Detailed.`,

  fluid: `**STYLE: ETHEREAL FLUID / ABSTRACT 3D**
- Liquid gradients, mesh gradients, glassmorphism
- Flowing abstract shapes suggesting motion and connectivity
- Deep iridescent colors, high-end gloss finish
- Futuristic, Premium, AI, Web3, Flowing aesthetic.`,

  collage: `**STYLE: MIXED MEDIA DIGITAL COLLAGE**
- Edge-to-edge artistic composition
- Cut-out elements, ripped paper edges, halftone dots, grain textures
- Vintage imagery juxtaposed with modern tech elements
- Bold contrasting colors, desaturated photos mixed with vibrant vectors
- Artsy, Disruptive, Creative, Editorial vibe.`,

  explainer: `**STYLE: FLAT VECTOR / GRAPHIC EXPLAINER**
- "Corporate Memphis" style high-quality vector art
- Visual narrative scene spanning the banner width
- Characters using the product, or abstract service flow representations
- Pastel background with bold primary accents
- Friendly, Accessible, SaaS, Startup aesthetic
- No shading, no gradients, pure flat vector.`,

  minimal: `**STYLE: ULTRA-MINIMAL**
- Maximum whitespace or single color field
- One focal element, perfectly placed
- Monochromatic or 2 colors maximum
- Geometric purity: circles, lines, squares
- Apple or Muji aesthetic, sophisticated simplicity.`,

  gradient: `**STYLE: AURORA GRADIENT**
- Smooth flowing mesh gradients
- 3-4 colors blending seamlessly with depth
- Subtle grain texture overlay for organic feel
- iOS wallpaper or Stripe aesthetic
- Modern, Premium, Tech-forward.`,

  geometric: `**STYLE: GEOMETRIC PATTERNS**
- Repeating or interlocking shapes, tessellations
- Bold color blocking within shapes
- Mathematical precision, perfect symmetry
- Op-art or Bauhaus influence
- Architectural, Data-driven aesthetic.`,

  retro: `**STYLE: RETRO VINTAGE 70s-80s**
- Orange, brown, teal, cream color palette
- Halftone dots, sun rays, rounded corners
- Grain, scratches, aged paper texture
- Nostalgic warmth, analog feeling
- Vintage travel poster or record sleeve vibe.`,
}

/**
 * Generate banner using Imagen 4
 * Creates brand assets that convey identity through symbolism and composition
 */
export async function generateBannerWithImagen(
  brandAnalysis: BrandAnalysis,
  platform: Platform,
  style: Style
): Promise<string> {
  const ai = getClient()
  const aspectRatio = PLATFORM_ASPECT_RATIO[platform]
  const styleGuide = STYLE_GUIDES[style] || STYLE_GUIDES.minimal
  const colors = brandAnalysis.brandColors.slice(0, 3).join(', ')

  // Build a rich, contextual prompt like Orbator
  const prompt = `Create a professional ${platform} banner/header for "${brandAnalysis.brandName}".

**BRAND CONTEXT:**
- Brand: ${brandAnalysis.brandName}
- Industry: ${brandAnalysis.industry || 'Technology'}
- What they do: ${brandAnalysis.summary || 'Modern digital service'}
- Tagline: "${brandAnalysis.slogan || 'Innovation for everyone'}"
- Brand Colors: ${colors || '#3b82f6, #ffffff, #000000'}

${styleGuide}

**COMPOSITION REQUIREMENTS:**
- Full-width landscape banner that fills the entire canvas
- The art itself should EXPLAIN the brand's niche and value through symbolism
- Create visual narrative that represents what the brand does
- Use the brand colors prominently throughout the design
- Make it look like a finished, professional marketing asset

**TEXT INTEGRATION:**
- Include the brand name "${brandAnalysis.brandName}" as elegant typography
- Optionally include the tagline "${brandAnalysis.slogan || ''}" if it fits the composition
- Text should be integrated naturally into the design, not overlaid awkwardly
- Typography style should match the overall aesthetic

**CRITICAL CONSTRAINTS:**
- NO stock photo look - this should be distinctive art
- NO generic placeholder imagery
- The visual should be self-explanatory and represent this specific brand
- High quality, 8K detail level
- Must look like a premium, finished advertisement`

  const maxRetries = 3
  let lastError: Error | null = null

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      console.log(`[Imagen] Generating ${platform} banner (${aspectRatio}), attempt ${attempt + 1}`)
      
      const response = await ai.models.generateImages({
        model: 'imagen-4.0-generate-001',
        prompt: prompt,
        config: {
          aspectRatio: aspectRatio,
          numberOfImages: 1,
        }
      })

      const imageData = response.generatedImages?.[0]?.image?.imageBytes
      if (imageData) {
        console.log(`[Imagen] Successfully generated ${platform} banner`)
        return `data:image/png;base64,${imageData}`
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

/**
 * Generate favicon/icon using Imagen 4
 */
export async function generateIconWithImagen(
  brandAnalysis: BrandAnalysis,
  style: Style
): Promise<string> {
  const ai = getClient()
  const primaryColor = brandAnalysis.brandColors[0] || '#3b82f6'
  const secondaryColor = brandAnalysis.brandColors[1] || '#ffffff'

  // Map style to icon aesthetic
  const iconStyle: Record<Style, string> = {
    blueprint: 'Technical schematic icon with cyan lines on dark navy, circuit aesthetic',
    brutalism: 'Bold neo-brutalist icon, heavy black borders, neon accent, raw aesthetic',
    isometric: 'Isometric 3D icon, soft shadows, claymorphism, playful tech vibe',
    fluid: 'Ethereal glass icon, iridescent gradients, flowing organic shape',
    collage: 'Mixed media textured icon, paper-cut layers, artsy creative feel',
    explainer: 'Flat vector icon, clean minimal shapes, friendly SaaS aesthetic',
    minimal: 'Ultra-minimal geometric icon, one shape, maximum whitespace',
    gradient: 'Aurora gradient icon, smooth flowing colors, modern app style',
    geometric: 'Geometric pattern icon, interlocking shapes, mathematical precision',
    retro: 'Vintage retro icon, warm 70s colors, halftone texture, nostalgic',
  }

  const prompt = `Create a premium app icon for "${brandAnalysis.brandName}".

**BRAND:**
- Name: ${brandAnalysis.brandName}
- Industry: ${brandAnalysis.industry || 'Technology'}
- What they do: ${brandAnalysis.summary || 'Digital service'}

**COLORS:**
- Primary: ${primaryColor}
- Secondary: ${secondaryColor}

**STYLE:** ${iconStyle[style] || iconStyle.minimal}

**REQUIREMENTS:**
- Square 1:1 format, optimized for 16px to 512px display
- SINGLE distinctive symbol that represents this brand
- Strong silhouette that works in monochrome
- Centered with ~15% padding
- Crisp vector-like edges
- App Store / Google Play quality
- Could include a stylized letter from the brand name if appropriate

**CRITICAL:**
- UNIQUE to "${brandAnalysis.brandName}" - not generic
- Must pass "squint test" - recognizable when small
- NO generic symbols (gears, lightbulbs, handshakes, globes)
- Premium, memorable, distinctive`

  const maxRetries = 3
  let lastError: Error | null = null

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      console.log(`[Imagen] Generating favicon, attempt ${attempt + 1}`)
      
      const response = await ai.models.generateImages({
        model: 'imagen-4.0-generate-001',
        prompt: prompt,
        config: {
          aspectRatio: '1:1',
          numberOfImages: 1,
        }
      })

      const imageData = response.generatedImages?.[0]?.image?.imageBytes
      if (imageData) {
        console.log(`[Imagen] Successfully generated favicon`)
        return `data:image/png;base64,${imageData}`
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
