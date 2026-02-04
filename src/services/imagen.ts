/**
 * Image Generation Service
 * 
 * Uses:
 * - Gemini 3 Pro Image for banners (supports custom aspect ratios)
 * - Imagen 4 for favicons (1:1 square)
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

// Platform-specific aspect ratios
const PLATFORM_RATIOS: Record<Platform, string> = {
  twitter: '3:1',    // 1500×500
  linkedin: '4:1',   // 1584×396
  youtube: '16:9',   // 2560×1440
  facebook: '8:3',   // 820×312 ≈ 2.6:1, closest common ratio
  og: '1200:630',    // OG images are 1200×630
}

/**
 * Generate banner using Gemini 3 Pro Image
 * Supports custom aspect ratios for each platform
 */
export async function generateBannerWithImagen(
  brandAnalysis: BrandAnalysis,
  platform: Platform,
  style: Style
): Promise<string> {
  const ai = getClient()
  const aspectRatio = PLATFORM_RATIOS[platform]

  // Always use our text-focused prompt
  // NOTE: We ignore brandAnalysis.visualPrompt because it's designed for abstract 
  // backgrounds without text. Brand assets need actual text (slogan, CTA, etc.)
  const prompt = `Create a professional ${platform} banner for "${brandAnalysis.brandName}".

**BRAND INFORMATION:**
- Brand Name: ${brandAnalysis.brandName}
- Industry: ${brandAnalysis.industry || 'Technology'}
- What they do: ${brandAnalysis.summary || 'Modern digital service'}

**EXACT TEXT TO DISPLAY ON THE BANNER (use these exact words):**
1. Brand Name (large): "${brandAnalysis.brandName}"
2. Tagline/Slogan: "${brandAnalysis.slogan || ''}"
3. Call-to-Action button: "${brandAnalysis.cta || 'Get Started'}"

**STYLE:** ${style}

**DESIGN REQUIREMENTS:**
- Display ALL three text elements prominently
- Brand name should be the largest text
- Slogan should be readable supporting text  
- CTA should look like a button
- Wide landscape banner, fill the entire canvas
- Premium marketing asset quality
- 8K, highly detailed

**CRITICAL: Do NOT invent new slogans or taglines. Use EXACTLY the text provided above.**`
  
  // Log the actual prompt being used
  console.log(`[Imagen] Prompt for ${platform}:`)
  console.log(`  Brand: ${brandAnalysis.brandName}`)
  console.log(`  Slogan: ${brandAnalysis.slogan}`)
  console.log(`  CTA: ${brandAnalysis.cta}`)
  console.log(`  visualPrompt provided: ${brandAnalysis.visualPrompt ? 'YES' : 'NO'}`)

  const maxRetries = 3
  let lastError: Error | null = null

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      console.log(`[Imagen] Generating ${platform} banner (${aspectRatio}), attempt ${attempt + 1}`)
      
      // Use Gemini 3 Pro Image for custom aspect ratios
      const response = await ai.models.generateContent({
        model: 'gemini-3-pro-image-preview',
        contents: prompt + ` (Variation Seed: ${Date.now()})`,
        config: {
          responseModalities: ['Image'],
          imageConfig: {
            aspectRatio: aspectRatio,
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

/**
 * Generate favicon/icon using Imagen 4 (better for 1:1 icons)
 */
export async function generateIconWithImagen(
  brandAnalysis: BrandAnalysis,
  style: Style
): Promise<string> {
  const ai = getClient()
  const primaryColor = brandAnalysis.brandColors[0] || '#3b82f6'
  const secondaryColor = brandAnalysis.brandColors[1] || '#ffffff'

  // Map style to icon aesthetic
  const iconStyles: Record<Style, string> = {
    blueprint: 'Technical schematic icon, cyan lines on dark navy, circuit aesthetic',
    brutalism: 'Bold neo-brutalist icon, heavy black borders, neon accent, raw',
    isometric: 'Isometric 3D icon, soft shadows, claymorphism, playful tech',
    fluid: 'Ethereal glass icon, iridescent gradients, flowing organic shape',
    collage: 'Mixed media textured icon, paper-cut layers, artsy creative',
    explainer: 'Flat vector icon, clean minimal shapes, friendly SaaS aesthetic',
    minimal: 'Ultra-minimal geometric icon, one shape, maximum whitespace',
    gradient: 'Aurora gradient icon, smooth flowing colors, modern app style',
    geometric: 'Geometric pattern icon, interlocking shapes, mathematical',
    retro: 'Vintage retro icon, warm 70s colors, halftone texture, nostalgic',
  }

  const prompt = `Create a premium app icon for "${brandAnalysis.brandName}".

Brand: ${brandAnalysis.brandName} - ${brandAnalysis.industry || 'Technology'}
What they do: ${brandAnalysis.summary || 'Digital service'}
Icon concept: ${brandAnalysis.iconConcept || 'abstract symbol'}

Use these colors in the design (do NOT display as text): primary color is a teal/green, secondary is dark navy.

Style: ${iconStyles[style] || iconStyles.minimal}

Requirements:
- Square 1:1 format, works at 16px to 512px
- SINGLE distinctive symbol representing "${brandAnalysis.brandName}"
- Can include a stylized single letter from brand name if appropriate
- Strong silhouette, works in monochrome
- NO text, NO words, NO letters except possibly one stylized initial
- NO hex codes or color codes visible
- Centered with ~15% padding
- Crisp vector-like edges
- App Store quality

Critical: UNIQUE to this brand, not generic. Memorable and distinctive.`

  const maxRetries = 3
  let lastError: Error | null = null

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      console.log(`[Imagen] Generating favicon, attempt ${attempt + 1}`)
      
      // Use Imagen 4 for 1:1 icons
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
