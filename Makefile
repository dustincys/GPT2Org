# Makefile for building and packaging the GPT2Org extension

EXTENSION_NAME = GPT2Org
ZIP_FILE = $(EXTENSION_NAME).zip

SRC_FILES = capture.js lib options.js options.html popup.js popup.html styles.css background.js img README.org LICENSE manifest.json

BUILD_DIR = build

.PHONY: all build package

# Default target: build the extension
all: build package

# Create the build directory and copy necessary files
build:
	@echo "Creating build directory..."
	mkdir -p $(BUILD_DIR)
	cp -r $(SRC_FILES) $(BUILD_DIR)
	@echo "Build directory created and files copied."

# Package the extension into a .xpi file
package: build
	@echo "Packaging into $(ZIP_FILE)..."
	cd $(BUILD_DIR)
	zip -r $(ZIP_FILE) ./*
	@echo "Packaging complete."

# Clean the build directory
clean:
	@echo "Cleaning up build directory..."
	rm -rf $(BUILD_DIR)
	rm -f $(ZIP_FILE)
	@echo "Build directory removed."
