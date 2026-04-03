<template>
  <section aria-labelledby="upload-title">
    <h2 id="upload-title" class="sr-only">Upload Images</h2>
    <form ref="dropzone" class="dropzone" id="imageUpload">
      <div class="dz-message" data-dz-message>
        <span>Drop images here or click to upload</span>
      </div>
    </form>
  </section>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue';
import Dropzone from 'dropzone';
import { useImageProcessing } from '../composables/useImageProcessing';
import { logger } from '../utils/logger';

const props = defineProps({
  onImageProcessed: {
    type: Function,
    required: true
  }
});

const dropzone = ref(null);
const { processImage } = useImageProcessing();

// Keep a stable reference so the paste handler can be removed on unmount
function handlePaste(event) {
  const items = (event.clipboardData || event.originalEvent?.clipboardData)?.items;
  if (!items) return;
  for (const item of items) {
    if (item.type.startsWith('image/')) {
      event.preventDefault();
      const file = item.getAsFile();
      if (file && dropzone.value) {
        dropzone.value.addFile(file);
      }
      break;
    }
  }
}

onMounted(() => {
  initializeDropzone();
  document.addEventListener('paste', handlePaste);
});

onBeforeUnmount(() => {
  document.removeEventListener('paste', handlePaste);
  if (dropzone.value) {
    dropzone.value.destroy();
  }
});

function initializeDropzone() {
  if (dropzone.value) {
    dropzone.value.destroy();
  }

  Dropzone.autoDiscover = false;
  dropzone.value = new Dropzone("#imageUpload", {
    url: "#",
    autoProcessQueue: false,
    createImageThumbnails: true,
    acceptedFiles: "image/*",
    addRemoveLinks: true,
    maxFiles: 10,
    maxFilesize: 5,
    dictDefaultMessage: "Drop images here or click to upload",
    dictInvalidFileType: "This file type is not supported",
    dictFileTooBig: "File is too large ({{filesize}}MB). Max filesize: {{maxFilesize}}MB.",
    accept: async function(file, done) {
      try {
        if (!file.type.startsWith('image/')) {
          done('Invalid file type. Please upload an image file.');
          return;
        }
        await processImage(file);
        done();
      } catch (error) {
        logger.error('File processing error:', error);
        done(error.message);
      }
    }
  });

  dropzone.value.on("addedfile", () => {
    // Batch mode: allow multiple files (up to maxFiles)
  });

  dropzone.value.on("error", (file, errorMessage) => {
    logger.error('Dropzone error:', errorMessage);
    const msg = typeof errorMessage === 'string' ? errorMessage : errorMessage?.message;
    if (msg) {
      props.onImageProcessed?.({ error: msg });
    }
    dropzone.value.removeFile(file);
  });
}
</script>

<style>
/* Use stock Dropzone styles with theme support */
.dropzone {
  min-height: 150px !important;
  border: 2px dashed #0087F7 !important;
  border-radius: 5px !important;
  background: white !important;
  transition: all 0.3s ease !important;
}

.dropzone:hover {
  border-color: #0056b3 !important;
}

:root.dark .dropzone {
  background: #1a1a1a !important;
  border-color: #4a5568 !important;
}

:root.dark .dropzone:hover {
  border-color: #718096 !important;
}

.dropzone .dz-message {
  margin: 2em 0 !important;
  font-size: 1.5em !important;
  color: #666 !important;
}

:root.dark .dropzone .dz-message {
  color: #a0aec0 !important;
}

.dropzone .dz-preview {
  margin: 1rem !important;
}

.dropzone .dz-preview .dz-error-message {
  background: #f56565 !important;
  color: white !important;
}

:root.dark .dropzone .dz-preview .dz-error-message {
  background: #742a2a !important;
}

.dropzone .dz-preview .dz-image {
  border-radius: 4px !important;
}

.dropzone .dz-preview.dz-image-preview {
  background: transparent !important;
}

:root.dark .dropzone .dz-preview.dz-image-preview {
  background: transparent !important;
}

.dropzone .dz-preview .dz-details {
  color: #666 !important;
}

:root.dark .dropzone .dz-preview .dz-details {
  color: #a0aec0 !important;
}
</style> 