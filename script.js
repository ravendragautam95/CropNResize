document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const uploadSection = document.getElementById('uploadSection');
    const editorSection = document.getElementById('editorSection');
    const uploadArea = document.getElementById('uploadArea');
    const fileInput = document.getElementById('fileInput');
    const previewCanvas = document.getElementById('previewCanvas');
    const previewContainer = document.getElementById('previewContainer');
    const cropBox = document.getElementById('cropBox');
    const ctx = previewCanvas.getContext('2d');
    
    // Preview Modal Elements
    const previewModal = document.getElementById('previewModal');
    const previewOutputCanvas = document.getElementById('previewOutputCanvas');
    const previewBtn = document.getElementById('previewBtn');
    const downloadBtn = document.getElementById('downloadBtn');
    const confirmDownload = document.getElementById('confirmDownload');
    const closePreview = document.getElementById('closePreview');
    const cancelPreview = document.getElementById('cancelPreview');
    
    // Input Elements
    const widthInput = document.getElementById('width');
    const heightInput = document.getElementById('height');
    const minSizeInput = document.getElementById('minSize');
    const maxSizeInput = document.getElementById('maxSize');
    const cancelBtn = document.getElementById('cancelBtn');

    // State variables
    let originalImage = null;
    let currentZoom = 100;
    let isDragging = false;
    let startX = 0;
    let startY = 0;
    let imageX = 0;
    let imageY = 0;
    let croppedImageData = null;

    // Touch event handling
    let touchStartX = 0;
    let touchStartY = 0;
    let touchStartImageX = 0;
    let touchStartImageY = 0;
    let lastTouchDistance = 0;
    let isPinching = false;

    // Initialize default values
    widthInput.value = 200;
    heightInput.value = 200;
    minSizeInput.value = 10;
    maxSizeInput.value = 50;

    // Input change handlers
    widthInput.addEventListener('change', () => {
        updateCropBox();
        constrainImage();
        drawImage();
    });

    heightInput.addEventListener('change', () => {
        updateCropBox();
        constrainImage();
        drawImage();
    });

    // Mouse wheel zoom handling
    previewContainer.addEventListener('wheel', (e) => {
        e.preventDefault();
        
        // Get mouse position relative to canvas
        const rect = previewCanvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        
        // Calculate zoom
        const delta = e.deltaY * -0.01;
        const oldZoom = currentZoom;
        
        // Calculate new zoom level
        let newZoom = currentZoom + delta * 10;
        
        // Get crop box dimensions and position
        const cropRect = cropBox.getBoundingClientRect();
        const canvasRect = previewCanvas.getBoundingClientRect();
        const cropWidth = cropRect.width;
        const cropHeight = cropRect.height;
        
        // Calculate minimum zoom level to ensure image covers crop box
        const scaleX = cropWidth / originalImage.width;
        const scaleY = cropHeight / originalImage.height;
        const minZoom = Math.max(scaleX, scaleY) * 100; // Minimum zoom to cover crop box
        
        // Constrain zoom level
        newZoom = Math.max(minZoom, Math.min(400, newZoom));
        
        // Only update if zoom level changed
        if (newZoom !== currentZoom) {
            currentZoom = newZoom;
            
            // Calculate new position to zoom towards mouse
            const zoomFactor = currentZoom / oldZoom;
            imageX = mouseX - (mouseX - imageX) * zoomFactor;
            imageY = mouseY - (mouseY - imageY) * zoomFactor;
            
            // Keep the image within bounds
            constrainImage();
            drawImage();
        }
    });

    function constrainImage() {
        const scale = currentZoom / 100;
        const scaledWidth = originalImage.width * scale;
        const scaledHeight = originalImage.height * scale;
        
        // Get crop box dimensions and position
        const cropRect = cropBox.getBoundingClientRect();
        const canvasRect = previewCanvas.getBoundingClientRect();
        const cropLeft = cropRect.left - canvasRect.left;
        const cropTop = cropRect.top - canvasRect.top;
        
        // Calculate bounds to ensure image covers crop box
        const minX = cropLeft + cropRect.width - scaledWidth; // Rightmost position
        const maxX = cropLeft; // Leftmost position
        const minY = cropTop + cropRect.height - scaledHeight; // Bottom position
        const maxY = cropTop; // Top position
        
        // Constrain image position
        imageX = Math.min(maxX, Math.max(minX, imageX));
        imageY = Math.min(maxY, Math.max(minY, imageY));
    }

    // Upload handlers
    uploadArea.addEventListener('click', () => fileInput.click());
    uploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadArea.classList.add('drag-over');
    });
    uploadArea.addEventListener('dragleave', () => {
        uploadArea.classList.remove('drag-over');
    });
    uploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadArea.classList.remove('drag-over');
        const file = e.dataTransfer.files[0];
        if (file && file.type.startsWith('image/')) {
            handleImageUpload(file);
        }
    });
    fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) handleImageUpload(file);
    });

    function handleImageUpload(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            originalImage = new Image();
            originalImage.onload = () => {
                uploadSection.style.display = 'none';
                editorSection.style.display = 'block';
                
                updateCanvasSize();
                updateCropBox();
                centerImage();
                drawImage();
                
                cropBox.classList.add('active');
            };
            originalImage.src = e.target.result;
        };
        reader.readAsDataURL(file);
    }

    function updateCanvasSize() {
        const container = previewContainer;
        const containerWidth = container.clientWidth;
        const containerHeight = container.clientHeight;
        const imageAspectRatio = originalImage.width / originalImage.height;
        const containerAspectRatio = containerWidth / containerHeight;

        let canvasWidth, canvasHeight;

        // Adjust for mobile viewport
        if (window.innerWidth <= 768) {
            // On mobile, make the canvas slightly larger than the container
            // to allow for better touch interaction
            canvasWidth = containerWidth * 1.2;
            canvasHeight = canvasWidth / imageAspectRatio;
            
            if (canvasHeight < containerHeight) {
                canvasHeight = containerHeight * 1.2;
                canvasWidth = canvasHeight * imageAspectRatio;
            }
        } else {
            if (imageAspectRatio > containerAspectRatio) {
                canvasWidth = containerWidth;
                canvasHeight = containerWidth / imageAspectRatio;
            } else {
                canvasHeight = containerHeight;
                canvasWidth = containerHeight * imageAspectRatio;
            }
        }

        previewCanvas.width = canvasWidth;
        previewCanvas.height = canvasHeight;
        previewCanvas.style.width = `${canvasWidth}px`;
        previewCanvas.style.height = `${canvasHeight}px`;
        
        // Center the canvas
        previewCanvas.style.left = `${(containerWidth - canvasWidth) / 2}px`;
        previewCanvas.style.top = `${(containerHeight - canvasHeight) / 2}px`;

        // Calculate initial zoom to fit the crop box
        const cropWidth = parseInt(widthInput.value);
        const cropHeight = parseInt(heightInput.value);
        const scaleX = cropWidth / originalImage.width;
        const scaleY = cropHeight / originalImage.height;
        currentZoom = Math.max(scaleX, scaleY) * 100 * 1.1; // Add 10% padding
        
        // Center the image
        centerImage();
    }

    function centerImage() {
        if (!originalImage) return;
        
        const scale = currentZoom / 100;
        const scaledWidth = originalImage.width * scale;
        const scaledHeight = originalImage.height * scale;
        
        const cropRect = cropBox.getBoundingClientRect();
        const canvasRect = previewCanvas.getBoundingClientRect();
        const cropLeft = cropRect.left - canvasRect.left;
        const cropTop = cropRect.top - canvasRect.top;
        
        // Center the image relative to the crop box
        imageX = cropLeft + (cropRect.width - scaledWidth) / 2;
        imageY = cropTop + (cropRect.height - scaledHeight) / 2;
    }

    function updateCropBox() {
        const width = parseInt(widthInput.value);
        const height = parseInt(heightInput.value);
        
        // Set fixed size for crop box in pixels
        cropBox.style.width = `${width}px`;
        cropBox.style.height = `${height}px`;
        
        // Center the crop box in the preview container
        const containerRect = previewContainer.getBoundingClientRect();
        const left = (containerRect.width - width) / 2;
        const top = (containerRect.height - height) / 2;
        
        cropBox.style.left = `${left}px`;
        cropBox.style.top = `${top}px`;
        
        if (originalImage) {
            // Update zoom to ensure image covers crop box
            const scaleX = width / originalImage.width;
            const scaleY = height / originalImage.height;
            const minZoom = Math.max(scaleX, scaleY) * 100;
            currentZoom = Math.max(currentZoom, minZoom);
            
            centerImage();
            constrainImage();
            drawImage();
        }
    }

    function drawImage() {
        ctx.clearRect(0, 0, previewCanvas.width, previewCanvas.height);
        
        const scale = currentZoom / 100;
        const scaledWidth = originalImage.width * scale;
        const scaledHeight = originalImage.height * scale;
        
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(originalImage, imageX, imageY, scaledWidth, scaledHeight);
    }

    function getCroppedImage() {
        const cropCanvas = document.createElement('canvas');
        cropCanvas.width = parseInt(widthInput.value);
        cropCanvas.height = parseInt(heightInput.value);
        
        const cropCtx = cropCanvas.getContext('2d');
        cropCtx.imageSmoothingEnabled = true;
        cropCtx.imageSmoothingQuality = 'high';
        
        const cropRect = cropBox.getBoundingClientRect();
        const canvasRect = previewCanvas.getBoundingClientRect();
        const cropLeft = cropRect.left - canvasRect.left;
        const cropTop = cropRect.top - canvasRect.top;
        
        cropCtx.drawImage(
            previewCanvas,
            cropLeft, cropTop, cropRect.width, cropRect.height,
            0, 0, cropCanvas.width, cropCanvas.height
        );

        return cropCanvas;
    }

    // Preview and Download handling
    previewBtn.addEventListener('click', async () => {
        const croppedCanvas = getCroppedImage();
        previewOutputCanvas.width = croppedCanvas.width;
        previewOutputCanvas.height = croppedCanvas.height;
        const ctx = previewOutputCanvas.getContext('2d');
        ctx.drawImage(croppedCanvas, 0, 0);
        
        // Update dimensions display
        const dimensionsElement = document.getElementById('previewDimensions');
        dimensionsElement.textContent = `${croppedCanvas.width} × ${croppedCanvas.height} px`;
        
        // Update file size display
        const fileSizeElement = document.getElementById('previewFileSize');
        const size = await getImageSizeInKB(croppedCanvas, 1.0);
        fileSizeElement.textContent = `${size.toFixed(1)} KB`;
        
        previewModal.classList.add('show');
        croppedImageData = croppedCanvas;
    });

    async function getImageSizeInKB(canvas, quality) {
        return new Promise((resolve) => {
            canvas.toBlob((blob) => {
                resolve(blob.size / 1024); // Convert to KB
            }, 'image/jpeg', quality);
        });
    }

    async function enhanceImageSize(canvas, targetSize) {
        const currentSize = await getImageSizeInKB(canvas, 1.0);
        
        // Calculate scale factor needed to reach target size
        // We use a larger multiplier because JPEG compression will reduce the final size
        const scaleFactor = Math.sqrt(targetSize / currentSize) * 2;
        
        // Create a new canvas with enhanced dimensions
        const enhancedCanvas = document.createElement('canvas');
        enhancedCanvas.width = Math.round(canvas.width * scaleFactor);
        enhancedCanvas.height = Math.round(canvas.height * scaleFactor);
        
        // Draw the image at enhanced size with high quality
        const ctx = enhancedCanvas.getContext('2d');
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(canvas, 0, 0, enhancedCanvas.width, enhancedCanvas.height);
        
        return enhancedCanvas;
    }

    async function processImageForDownload(canvas) {
        const minSize = parseInt(minSizeInput.value);
        const maxSize = parseInt(maxSizeInput.value);
        let processedCanvas = canvas;
        let quality = 1.0; // Start with maximum quality
        
        // Check initial size
        let currentSize = await getImageSizeInKB(processedCanvas, quality);
        
        // If image is too small, enhance it
        while (currentSize < minSize) {
            processedCanvas = await enhanceImageSize(processedCanvas, minSize);
            currentSize = await getImageSizeInKB(processedCanvas, quality);
            
            // Safety check to prevent infinite loop
            if (processedCanvas.width > 8000 || processedCanvas.height > 8000) {
                break;
            }
        }
        
        // If image is too large, reduce quality
        if (currentSize > maxSize) {
            let low = 0.1;
            let high = 1.0;
            
            // Binary search for appropriate quality
            for (let i = 0; i < 10; i++) {
                quality = (low + high) / 2;
                currentSize = await getImageSizeInKB(processedCanvas, quality);
                
                if (currentSize > maxSize) {
                    high = quality;
                } else if (currentSize < minSize) {
                    low = quality;
                } else {
                    break;
                }
            }
            
            // If we still haven't reached minimum size, increase quality
            while (currentSize < minSize && quality < 1.0) {
                quality = Math.min(1.0, quality + 0.1);
                currentSize = await getImageSizeInKB(processedCanvas, quality);
            }
        }
        
        // Final size check and adjustment
        currentSize = await getImageSizeInKB(processedCanvas, quality);
        if (currentSize < minSize) {
            // One final attempt to reach minimum size by increasing dimensions
            const finalScaleFactor = Math.sqrt(minSize / currentSize) * 1.2;
            const finalCanvas = document.createElement('canvas');
            finalCanvas.width = Math.round(processedCanvas.width * finalScaleFactor);
            finalCanvas.height = Math.round(processedCanvas.height * finalScaleFactor);
            
            const ctx = finalCanvas.getContext('2d');
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';
            ctx.drawImage(processedCanvas, 0, 0, finalCanvas.width, finalCanvas.height);
            
            processedCanvas = finalCanvas;
        }
        
        return { canvas: processedCanvas, quality, size: currentSize };
    }

    confirmDownload.addEventListener('click', async () => {
        if (croppedImageData) {
            const { canvas, quality, size } = await processImageForDownload(croppedImageData);
            
            // Update file size display with final size
            const fileSizeElement = document.getElementById('previewFileSize');
            fileSizeElement.textContent = `${size.toFixed(1)} KB`;
            
            canvas.toBlob((blob) => {
                const link = document.createElement('a');
                link.download = 'cropped-image.jpg';
                link.href = URL.createObjectURL(blob);
                link.click();
                URL.revokeObjectURL(link.href);
                previewModal.classList.remove('show');
            }, 'image/jpeg', quality);
        }
    });

    closePreview.addEventListener('click', () => {
        previewModal.classList.remove('show');
    });

    cancelPreview.addEventListener('click', () => {
        previewModal.classList.remove('show');
    });

    // Image drag handling
    previewCanvas.addEventListener('mousedown', (e) => {
        if (e.touches) return; // Skip if touch event
        startDragging(e);
    });

    // Add touch support to the crop box
    cropBox.addEventListener('touchstart', (e) => {
        e.preventDefault();
        startDragging(e);
    });

    function startDragging(e) {
        isDragging = true;
        startX = e.clientX - imageX;
        startY = e.clientY - imageY;
        previewCanvas.style.cursor = 'grabbing';
    }

    function handleDragging(e) {
        if (!isDragging) return;
        
        e.preventDefault();
        
        imageX = e.clientX - startX;
        imageY = e.clientY - startY;
        
        constrainImage();
        drawImage();
    }

    function stopDragging() {
        isDragging = false;
        previewCanvas.style.cursor = 'move';
    }

    cancelBtn.addEventListener('click', () => {
        uploadSection.style.display = 'block';
        editorSection.style.display = 'none';
        fileInput.value = '';
        originalImage = null;
        currentZoom = 100;
        imageX = 0;
        imageY = 0;
    });

    // Handle window resize
    window.addEventListener('resize', () => {
        if (originalImage) {
            updateCanvasSize();
            updateCropBox();
            drawImage();
        }
    });

    // Mobile drawer functionality
    const menuToggle = document.querySelector('.menu-toggle');
    const drawerOverlay = document.querySelector('.drawer-overlay');
    const drawerClose = document.querySelector('.drawer-close');
    const mobileDrawer = document.querySelector('.mobile-drawer');
    const drawerLinks = document.querySelectorAll('.drawer-nav a');

    function toggleDrawer() {
        document.body.classList.toggle('drawer-open');
    }

    function closeDrawer() {
        document.body.classList.remove('drawer-open');
    }

    // Event listeners for mobile drawer
    menuToggle.addEventListener('click', toggleDrawer);
    drawerOverlay.addEventListener('click', closeDrawer);
    drawerClose.addEventListener('click', closeDrawer);

    // Close drawer when clicking on links
    drawerLinks.forEach(link => {
        link.addEventListener('click', closeDrawer);
    });

    // Close drawer when pressing Escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && document.body.classList.contains('drawer-open')) {
            closeDrawer();
        }
    });

    // Touch event handling
    previewCanvas.addEventListener('touchstart', (e) => {
        e.preventDefault();
        if (e.touches.length === 1) {
            // Single touch - dragging
            const touch = e.touches[0];
            const rect = previewCanvas.getBoundingClientRect();
            touchStartX = touch.clientX - rect.left;
            touchStartY = touch.clientY - rect.top;
            touchStartImageX = imageX;
            touchStartImageY = imageY;
            isDragging = true;
        } else if (e.touches.length === 2) {
            // Two touches - pinch to zoom
            isPinching = true;
            const touch1 = e.touches[0];
            const touch2 = e.touches[1];
            lastTouchDistance = Math.hypot(
                touch2.clientX - touch1.clientX,
                touch2.clientY - touch1.clientY
            );
        }
    });

    previewCanvas.addEventListener('touchmove', (e) => {
        e.preventDefault();
        if (isDragging && e.touches.length === 1) {
            const touch = e.touches[0];
            const rect = previewCanvas.getBoundingClientRect();
            const touchX = touch.clientX - rect.left;
            const touchY = touch.clientY - rect.top;
            
            // Calculate new position
            imageX = touchStartImageX + (touchX - touchStartX);
            imageY = touchStartImageY + (touchY - touchStartY);
            
            // Constrain the movement
            constrainImage();
            drawImage();
        } else if (isPinching && e.touches.length === 2) {
            const touch1 = e.touches[0];
            const touch2 = e.touches[1];
            const currentDistance = Math.hypot(
                touch2.clientX - touch1.clientX,
                touch2.clientY - touch1.clientY
            );
            
            // Calculate zoom factor
            const zoomFactor = currentDistance / lastTouchDistance;
            const oldZoom = currentZoom;
            currentZoom = Math.min(400, Math.max(100, currentZoom * zoomFactor));
            
            // Update position to zoom towards center of pinch
            const centerX = (touch1.clientX + touch2.clientX) / 2;
            const centerY = (touch1.clientY + touch2.clientY) / 2;
            const rect = previewCanvas.getBoundingClientRect();
            const centerCanvasX = centerX - rect.left;
            const centerCanvasY = centerY - rect.top;
            
            const zoomChange = currentZoom / oldZoom;
            imageX = centerCanvasX - (centerCanvasX - imageX) * zoomChange;
            imageY = centerCanvasY - (centerCanvasY - imageY) * zoomChange;
            
            lastTouchDistance = currentDistance;
            constrainImage();
            drawImage();
        }
    });

    previewCanvas.addEventListener('touchend', (e) => {
        e.preventDefault();
        isDragging = false;
        isPinching = false;
    });

    // Add double-tap to reset zoom
    let lastTap = 0;
    previewCanvas.addEventListener('touchend', (e) => {
        const currentTime = new Date().getTime();
        const tapLength = currentTime - lastTap;
        if (tapLength < 300 && tapLength > 0) {
            // Double tap detected
            e.preventDefault();
            currentZoom = 100;
            centerImage();
            drawImage();
        }
        lastTap = currentTime;
    });
}); 