import os, glob
from collections import Counter

base = 'C:/Users/Abhinandan Singh/Desktop/projects/Hole-Lotta-Problems/Hole-lotta-problems/backend/Hole-Lotta-Problems/data/yolo_dataset'
counts = Counter()

for split in ['train', 'val']:
    for label_file in glob.glob(os.path.join(base, 'labels', split, '*.txt')):
        with open(label_file, 'r') as f:
            for line in f:
                if line.strip():
                    try:
                        counts[int(line.split()[0])] += 1
                    except Exception:
                        pass
print('Class distribution:', dict(counts))
