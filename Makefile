# Makefile for building and packaging the GPT2Org extension

# Directories
BUILD_DIR = build

# Files to be copied to build folder
FILES = capture.js lib options.js options.html popup.js popup.html styles.css background.js img README.org LICENSE manifest.json

# Targets

# Default target: build the extension
all: build package

# Create the build directory and copy necessary files
build:
	@echo "Creating build directory..."
	mkdir -p $(BUILD_DIR)
	cp -r $(FILES) $(BUILD_DIR)
	@echo "Build directory created and files copied."

# Package the extension into a .xpi file
package: build
	@echo "Packaging into GPT2Org.xpi..."
	cd $(BUILD_DIR) && zip -r GPT2Org.xpi ./*
	@echo "Packaging complete."

# Clean the build directory
clean:
	@echo "Cleaning up build directory..."
	rm -rf $(BUILD_DIR)
	rm -rf GPT2Org.xpi
	@echo "Build directory removed."

.PHONY: all build package

