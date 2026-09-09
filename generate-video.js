const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

// Configuration
const SLIDES_DURATION = 12000; // 12 seconds per slide
const OUTPUT_DIR = path.join(__dirname, 'output');
const VIDEO_OUTPUT = path.join(OUTPUT_DIR, 'briefing-video.mp4');
const SCREENSHOTS_DIR = path.join(OUTPUT_DIR, 'screenshots');

// Ensure output directories exist
if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });
if (!fs.existsSync(SCREENSHOTS_DIR)) fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });

async function generateVideo() {
  console.log('📹 Starting video generation...');
  
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  
  // Set viewport for consistent sizing
  await page.setViewport({ width: 1920, height: 1080 });
  
  // Read the HTML file
  const htmlPath = path.join(__dirname, 'index.html');
  const htmlContent = fs.readFileSync(htmlPath, 'utf8');
  
  // Inject code to access slides data
  await page.setContent(htmlContent);
  
  // Get total number of slides
  const slidesCount = await page.evaluate(() => slides.length);
  console.log(`📊 Total slides: ${slidesCount}`);
  
  // Generate screenshots for each slide
  for (let i = 0; i < slidesCount; i++) {
    console.log(`📸 Capturing slide ${i + 1}/${slidesCount}...`);
    
    // Navigate to slide
    await page.evaluate((index) => {
      current = index;
      render();
    }, i);
    
    // Wait for rendering
    await page.waitForTimeout(500);
    
    // Take screenshot with padding for better visuals
    const screenshotPath = path.join(SCREENSHOTS_DIR, `slide-${String(i).padStart(3, '0')}.png`);
    await page.screenshot({ path: screenshotPath, fullPage: true });
  }
  
  await browser.close();
  console.log('✅ Screenshots captured');
  
  // Generate video using ffmpeg
  console.log('🎬 Compiling video with FFmpeg...');
  const { execSync } = require('child_process');
  
  const framesPerSlide = Math.round((SLIDES_DURATION / 1000) * 30); // 30 fps
  
  const ffmpegCommand = `ffmpeg -y \\
    -framerate 30 \\
    -pattern_type glob -i "${SCREENSHOTS_DIR}/*.png" \\
    -vf "scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2" \\
    -c:v libx264 \\
    -pix_fmt yuv420p \\
    -crf 23 \\
    -movflags +faststart \\
    "${VIDEO_OUTPUT}"`;
  
  try {
    execSync(ffmpegCommand, { stdio: 'inherit' });
    console.log(`✅ Video generated: ${VIDEO_OUTPUT}`);
  } catch (error) {
    console.error('❌ FFmpeg error:', error.message);
    console.log('Make sure FFmpeg is installed: brew install ffmpeg (macOS) or apt-get install ffmpeg (Linux)');
  }
}

generateVideo().catch(console.error);
