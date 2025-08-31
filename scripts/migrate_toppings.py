#!/usr/bin/env python3
"""
Script to help migrate toppings to separate repositories.
This script prepares each topping for migration by:
1. Adding necessary files (LICENSE, .gitignore)
2. Validating pyproject.toml
3. Creating repository initialization scripts
"""

import os
import shutil
import subprocess
from pathlib import Path

TOPPINGS_DIR = Path("toppings")
LICENSE_TEXT = """MIT License

Copyright (c) 2025 Ramen Team

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
"""

GITIGNORE_TEXT = """# Python
__pycache__/
*.py[cod]
*$py.class
*.so
.Python
build/
develop-eggs/
dist/
downloads/
eggs/
.eggs/
lib/
lib64/
parts/
sdist/
var/
wheels/
*.egg-info/
.installed.cfg
*.egg
MANIFEST

# PyInstaller
*.manifest
*.spec

# Installer logs
pip-log.txt
pip-delete-this-directory.txt

# Unit test / coverage reports
htmlcov/
.tox/
.coverage
.coverage.*
.cache
nosetests.xml
coverage.xml
*.cover
.hypothesis/
.pytest_cache/

# Virtual environments
.env
.venv
env/
venv/
ENV/
env.bak/
venv.bak/

# IDE
.vscode/
.idea/
*.swp
*.swo
*~

# OS
.DS_Store
Thumbs.db
"""

def prepare_topping(topping_path: Path):
    """Prepare a single topping for migration."""
    print(f"Preparing {topping_path.name}...")
    
    # Add LICENSE if not exists
    license_file = topping_path / "LICENSE"
    if not license_file.exists():
        license_file.write_text(LICENSE_TEXT)
        print(f"  ✓ Added LICENSE")
    
    # Add .gitignore if not exists  
    gitignore_file = topping_path / ".gitignore"
    if not gitignore_file.exists():
        gitignore_file.write_text(GITIGNORE_TEXT)
        print(f"  ✓ Added .gitignore")
    
    # Check pyproject.toml
    pyproject_file = topping_path / "pyproject.toml"
    if not pyproject_file.exists():
        print(f"  ⚠️  Missing pyproject.toml")
        return False
    
    # Validate entry points
    pyproject_text = pyproject_file.read_text()
    if 'entry-points."ramen.toppings"' not in pyproject_text:
        print(f"  ⚠️  Missing entry points in pyproject.toml")
        return False
    
    print(f"  ✓ pyproject.toml looks good")
    
    # Create git initialization script
    init_script = topping_path / "init_repo.sh"
    init_script_content = f"""#!/bin/bash
# Initialize git repository for {topping_path.name}

git init
git add .
git commit -m "Initial commit: {topping_path.name}"

echo "Repository initialized. Next steps:"
echo "1. Create repository on GitHub: {topping_path.name}"
echo "2. git remote add origin https://github.com/YOUR_ORG/{topping_path.name}.git"
echo "3. git push -u origin main"
echo "4. Set up CI/CD for PyPI publishing"
"""
    init_script.write_text(init_script_content)
    init_script.chmod(0o755)
    print(f"  ✓ Created init_repo.sh")
    
    return True

def main():
    """Main migration preparation."""
    if not TOPPINGS_DIR.exists():
        print("No toppings directory found!")
        return
    
    print("Preparing toppings for migration...\n")
    
    success_count = 0
    toppings = list(TOPPINGS_DIR.glob("ramen-topping-*"))
    
    for topping_path in toppings:
        if topping_path.is_dir():
            if prepare_topping(topping_path):
                success_count += 1
            print()
    
    print(f"Migration preparation complete!")
    print(f"Successfully prepared: {success_count}/{len(toppings)} toppings")
    
    print("\nNext steps:")
    print("1. Move each topping directory to a separate repository")
    print("2. Run init_repo.sh in each repository")  
    print("3. Create GitHub repositories")
    print("4. Set up CI/CD for PyPI publishing")
    print("5. Update main project dependencies")
    print("\nSee TOPPING_MIGRATION.md for detailed instructions.")

if __name__ == "__main__":
    main()