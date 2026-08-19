import struct
import zlib

def make_png(width, height):
    # A simple transparent 1x1 png (or 96x96)
    # Let's just make a 96x96 transparent PNG with a white box
    # Or just use PIL if available
    try:
        from PIL import Image, ImageDraw
        img = Image.new('RGBA', (96, 96), (0, 0, 0, 0))
        draw = ImageDraw.Draw(img)
        draw.ellipse((10, 10, 86, 86), fill=(255, 255, 255, 255))
        img.save("ic_notification.png", "PNG")
        print("Created using PIL")
    except ImportError:
        print("PIL not found, creating 1x1 transparent using struct")
        width, height = 96, 96
        # To avoid complexity, just a 1x1 transparent PNG
        width, height = 1, 1
        raw_data = b'\x00' + b'\x00\x00\x00\x00'
        
        def png_pack(png_tag, data):
            chunk_head = png_tag + data
            return (struct.pack("!I", len(data)) +
                    chunk_head +
                    struct.pack("!I", 0xFFFFFFFF & zlib.crc32(chunk_head)))

        magic = b'\x89PNG\r\n\x1a\n'
        ihdr = [width, height, 8, 6, 0, 0, 0]
        ihdr_data = struct.pack("!2I5B", *ihdr)
        idat_data = zlib.compress(raw_data, 9)
        iend_data = b''

        with open("ic_notification.png", "wb") as f:
            f.write(magic)
            f.write(png_pack(b'IHDR', ihdr_data))
            f.write(png_pack(b'IDAT', idat_data))
            f.write(png_pack(b'IEND', iend_data))

make_png(96, 96)
