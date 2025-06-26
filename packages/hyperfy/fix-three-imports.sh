#!/bin/bash

# Fix Three.js imports to use the custom wrapper

# Core nodes directory
cd src/core/nodes

# Replace Three.js imports in all files
for file in *.ts; do
    if [ -f "$file" ]; then
        echo "Fixing $file..."
        
        # Replace import statements
        sed -i '' 's/import { \([^}]*\) } from '\''three'\'';/import { THREE } from '\''..\/extras\/three'\'';/g' "$file"
        
        # Replace new Vector3() with new THREE.Vector3()
        sed -i '' 's/new Vector3(/new THREE.Vector3(/g' "$file"
        sed -i '' 's/new Quaternion(/new THREE.Quaternion(/g' "$file"
        sed -i '' 's/new Matrix4(/new THREE.Matrix4(/g' "$file"
        sed -i '' 's/new Euler(/new THREE.Euler(/g' "$file"
        sed -i '' 's/new Color(/new THREE.Color(/g' "$file"
        sed -i '' 's/new Box3(/new THREE.Box3(/g' "$file"
        sed -i '' 's/new Sphere(/new THREE.Sphere(/g' "$file"
        
        # Replace type annotations
        sed -i '' 's/: Vector3/: THREE.Vector3/g' "$file"
        sed -i '' 's/: Quaternion/: THREE.Quaternion/g' "$file"
        sed -i '' 's/: Matrix4/: THREE.Matrix4/g' "$file"
        sed -i '' 's/: Euler/: THREE.Euler/g' "$file"
        sed -i '' 's/: Color/: THREE.Color/g' "$file"
        sed -i '' 's/: Box3/: THREE.Box3/g' "$file"
        sed -i '' 's/: Sphere/: THREE.Sphere/g' "$file"
    fi
done

echo "Fixed core nodes directory"