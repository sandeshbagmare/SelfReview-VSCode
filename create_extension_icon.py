from PIL import Image, ImageDraw, ImageFont
import os

# Create a 128x128 image for the extension icon
img = Image.new('RGB', (128, 128), color='#FFFFFF')
draw = ImageDraw.Draw(img)

# Draw a document/code background
draw.rectangle([20, 15, 108, 113], fill='#2D2D30', outline='#007ACC', width=3)

# Draw code lines
line_color = '#858585'
for i in range(4):
    y = 30 + i * 15
    draw.rectangle([30, y, 90, y+3], fill=line_color)

# Draw a comment bubble
bubble_x, bubble_y = 70, 70
bubble_size = 35
draw.ellipse([bubble_x, bubble_y, bubble_x+bubble_size, bubble_y+bubble_size],
             fill='#007ACC', outline='#FFFFFF', width=2)

# Draw comment icon (speech bubble tail)
draw.polygon([(bubble_x+10, bubble_y+bubble_size),
              (bubble_x+5, bubble_y+bubble_size+8),
              (bubble_x+15, bubble_y+bubble_size)],
             fill='#007ACC')

# Draw three dots inside bubble (comment indicator)
try:
    font = ImageFont.truetype("C:/Windows/Fonts/arial.ttf", 20)
except:
    font = ImageFont.load_default()

draw.text((bubble_x+12, bubble_y+8), "💬", fill='#FFFFFF', font=font)

# Save the extension icon
output_path = 'extension-icon.png'
img.save(output_path)
print(f"Extension icon saved to: {os.path.abspath(output_path)}")
