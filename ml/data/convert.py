import os
import glob
import xml.etree.ElementTree as ET
import random
import shutil

# Paths
base_dir = r"C:\Users\Abhinandan Singh\Desktop\projects\Hole-Lotta-Problems\Hole-lotta-problems\backend\Hole-Lotta-Problems\data"
annotations_dir = os.path.join(base_dir, "annotations")
images_dir = os.path.join(base_dir, "images")
output_dir = os.path.join(base_dir, "yolo_dataset")

# Classes
classes = ["small_pothole", "medium_pothole", "large_pothole"]
class_mapping = {
    "small_pothole": 0,    # minor
    "medium_pothole": 1,   # moderate
    "large_pothole": 2     # severe
}

# Create output dirs
for split in ['train', 'val']:
    os.makedirs(os.path.join(output_dir, 'images', split), exist_ok=True)
    os.makedirs(os.path.join(output_dir, 'labels', split), exist_ok=True)

def convert_box(size, box):
    dw = 1. / (size[0])
    dh = 1. / (size[1])
    x = (box[0] + box[1]) / 2.0 - 1
    y = (box[2] + box[3]) / 2.0 - 1
    w = box[1] - box[0]
    h = box[3] - box[2]
    x = x * dw
    w = w * dw
    y = y * dh
    h = h * dh
    return (x, y, w, h)

# Get all images
image_files = glob.glob(os.path.join(images_dir, "*.jpg")) + glob.glob(os.path.join(images_dir, "*.png"))
random.shuffle(image_files)

# Split 80/20
split_idx = int(0.8 * len(image_files))
train_files = image_files[:split_idx]
val_files = image_files[split_idx:]

def process_files(files, split_name):
    for img_path in files:
        img_name = os.path.basename(img_path)
        base_name = os.path.splitext(img_name)[0]
        xml_path = os.path.join(annotations_dir, base_name + ".xml")
        
        if not os.path.exists(xml_path):
            continue
            
        tree = ET.parse(xml_path)
        root = tree.getroot()
        
        size_node = root.find('size')
        if size_node is None:
            continue
            
        w = int(size_node.find('width').text)
        h = int(size_node.find('height').text)
        
        # Output label file
        label_path = os.path.join(output_dir, 'labels', split_name, base_name + ".txt")
        out_file = open(label_path, 'w')
        
        has_objects = False
        for obj in root.iter('object'):
            cls_name = obj.find('name').text
            if cls_name not in class_mapping:
                continue
                
            cls_id = class_mapping[cls_name]
            xmlbox = obj.find('bndbox')
            b = (float(xmlbox.find('xmin').text), float(xmlbox.find('xmax').text), 
                 float(xmlbox.find('ymin').text), float(xmlbox.find('ymax').text))
            bb = convert_box((w, h), b)
            
            out_file.write(str(cls_id) + " " + " ".join([str(a) for a in bb]) + '\n')
            has_objects = True
            
        out_file.close()
        
        if has_objects:
            # Copy image
            shutil.copy(img_path, os.path.join(output_dir, 'images', split_name, img_name))
        else:
            os.remove(label_path)

print(f"Processing {len(train_files)} training files...")
process_files(train_files, 'train')
print(f"Processing {len(val_files)} validation files...")
process_files(val_files, 'val')
print("Done!")
