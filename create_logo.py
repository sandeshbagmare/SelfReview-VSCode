from PIL import Image, ImageDraw, ImageFont
import os

# Create a 128x128 image with a gradient-like background
img = Image.new('RGB', (128, 128), color='#007ACC')

# Create a draw object
draw = ImageDraw.Draw(img)

# Draw a circle background
draw.ellipse([10, 10, 118, 118], fill='#005A9E', outline='#FFFFFF', width=3)

# Try to use a system font, fallback to default if not available
try:
    font = ImageFont.truetype("arial.ttf", 50)
except:
    try:
        font = ImageFont.truetype("C:/Windows/Fonts/arial.ttf", 50)
    except:
        font = ImageFont.load_default()

# Draw initials "SB" in the center
text = "SB"
# Get text bounding box
bbox = draw.textbbox((0, 0), text, font=font)
text_width = bbox[2] - bbox[0]
text_height = bbox[3] - bbox[1]

# Center the text
x = (128 - text_width) // 2
y = (128 - text_height) // 2 - 5

draw.text((x, y), text, fill='#FFFFFF', font=font)

# Save the image
output_path = 'publisher-logo.png'
img.save(output_path)
print(f"Logo saved to: {os.path.abspath(output_path)}")
