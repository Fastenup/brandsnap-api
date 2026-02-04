import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import { analyzeBrand } from './services/gemini'
import { generateBannerWithImagen, generateIconWithImagen } from './services/imagen'
import type { GenerationRequest, GeneratedAsset, Platform, Style, BrandAnalysis } from './types'
import { PLATFORM_DIMENSIONS } from './types'

const app = express()
const PORT = process.env.PORT || 3001

// CORS configuration - allow brandsnap.io and www.brandsnap.io
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:3001', 
  'https://brandsnap.io',
  'https://www.brandsnap.io',
  ...(process.env.ALLOWED_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean)
]

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, etc.)
    if (!origin) return callback(null, true)
    // Check if origin matches any allowed origin
    if (allowedOrigins.some(allowed => origin === allowed || origin.startsWith(allowed))) {
      return callback(null, true)
    }
    // Log rejected origins for debugging
    console.log(`[CORS] Rejected origin: ${origin}`)
    return callback(null, false)
  },
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}))

app.use(express.json({ limit: '10mb' }))

// Health check
app.get('/', (req, res) => {
  res.json({ 
    status: 'ok', 
    service: 'brandsnap-api',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  })
})

app.get('/health', (req, res) => {
  res.json({ status: 'healthy' })
})

// Generate endpoint
app.post('/api/generate', async (req, res) => {
  const startTime = Date.now()
  
  try {
    const body: GenerationRequest & { brandAnalysis?: BrandAnalysis } = req.body
    const { url, description, platforms, style, customColors, includeFavicon, brandAnalysis: providedAnalysis } = body

    if (!url && !description && !providedAnalysis) {
      return res.status(400).json({
        success: false,
        error: 'URL, description, or brandAnalysis required'
      })
    }

    if (!platforms || platforms.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'At least one platform required'
      })
    }

    // Step 1: Use provided analysis OR analyze the brand using Gemini
    let brandAnalysis: BrandAnalysis
    
    if (providedAnalysis && providedAnalysis.brandName) {
      // Use pre-analyzed data (saves a Gemini API call!)
      console.log(`[Generate] Using provided analysis for: ${providedAnalysis.brandName}`)
      brandAnalysis = providedAnalysis
    } else {
      // Analyze with Gemini
      const inputType = url ? 'url' : 'text'
      const input = url || description || ''
      
      console.log(`[Generate] Analyzing brand: ${input}`)
      
      brandAnalysis = await analyzeBrand(
        input,
        inputType,
        style as Style,
        customColors?.join(', ')
      )
    }
    
    console.log(`[Generate] Brand: ${brandAnalysis.brandName}`)

    // Step 2: Generate images
    const assets: GeneratedAsset[] = []
    
    // Separate favicon from banner platforms
    const bannerPlatforms = platforms.filter(p => p !== 'favicon') as Platform[]
    const needsFavicon = platforms.includes('favicon' as Platform) || includeFavicon
    
    console.log(`[Generate] Platforms: ${bannerPlatforms.join(', ')}, Favicon: ${needsFavicon}`)
    
    // Helper to add delay
    const wait = (ms: number) => new Promise(r => setTimeout(r, ms))
    
    // Generate assets sequentially to avoid rate limits (we have time now!)
    const STAGGER_MS = 500
    
    // Generate banners
    for (const platform of bannerPlatforms) {
      const dims = PLATFORM_DIMENSIONS[platform]
      try {
        await wait(STAGGER_MS)
        const base64 = await generateBannerWithImagen(brandAnalysis, platform, style as Style)
        console.log(`[Generate] ${platform} complete`)
        assets.push({ platform, dimensions: dims, base64 })
      } catch (err: any) {
        console.error(`[Generate] Failed to generate ${platform}:`, err.message)
      }
    }
    
    // Generate favicon
    if (needsFavicon) {
      try {
        await wait(STAGGER_MS)
        const base64 = await generateIconWithImagen(brandAnalysis, style as Style)
        console.log(`[Generate] favicon complete`)
        assets.push({ 
          platform: 'favicon', 
          dimensions: { width: 512, height: 512 }, 
          base64 
        })
      } catch (err: any) {
        console.error(`[Generate] Failed to generate favicon:`, err.message)
      }
    }

    if (assets.length === 0) {
      return res.status(500).json({
        success: false,
        error: 'Failed to generate any images. Please try again.'
      })
    }

    const duration = ((Date.now() - startTime) / 1000).toFixed(1)
    console.log(`[Generate] Success! Generated ${assets.length} assets in ${duration}s`)

    return res.json({
      success: true,
      assets,
      brandAnalysis: {
        brandName: brandAnalysis.brandName,
        summary: brandAnalysis.summary,
        industry: brandAnalysis.industry,
        vibe: brandAnalysis.vibe,
        slogan: brandAnalysis.slogan,
        cta: brandAnalysis.cta,
        brandColors: brandAnalysis.brandColors,
        iconConcept: brandAnalysis.iconConcept,
        visualPrompt: brandAnalysis.visualPrompt,
      },
    })
  } catch (error: any) {
    console.error('[Generate] Error:', error)
    return res.status(500).json({
      success: false,
      error: error.message || 'Generation failed. Please try again.'
    })
  }
})

app.listen(PORT, () => {
  console.log(`🚀 BrandSnap API running on port ${PORT}`)
  console.log(`   Allowed origins: ${allowedOrigins.join(', ')}`)
})
