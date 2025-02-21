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

onMounted(() => {
  initializeDropzone();
});

onBeforeUnmount(() => {
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
    maxFiles: 1,
    maxFilesize: 5,
    dictDefaultMessage: "Drop images here or click to upload",
    dictInvalidFileType: "This file type is not supported",
    dictFileTooBig: "File is too large ({{filesize}}MB). Max filesize: {{maxFilesize}}MB.",
    accept: async function(file, done) {
      try {
        // Validate file type
        if (!file.type.startsWith('image/')) {
          done(`Invalid file type. Please upload an image file.`);
          return;
        }

        // Process the image
        await processImage(file);
        done();
      } catch (error) {
        logger.error('File processing error:', error);
        done(error.message);
      }
    }
  });

  dropzone.value.on("addedfile", (file) => {
    if (dropzone.value.files.length > 1) {
      dropzone.value.removeFile(dropzone.value.files[0]);
    }
  });

  dropzone.value.on("error", (file, errorMessage) => {
    logger.error('Dropzone error:', errorMessage);
    if (typeof errorMessage === 'string') {
      props.onImageProcessed?.({ error: errorMessage });
    } else if (errorMessage?.message) {
      props.onImageProcessed?.({ error: errorMessage.message });
    }
    dropzone.value.removeFile(file);
  });

  // Add clipboard paste support
  document.addEventListener('paste', (event) => {
    const items = (event.clipboardData || event.originalEvent.clipboardData).items;
    
    for (const item of items) {
      if (item.type.indexOf('image') === 0) {
        event.preventDefault();
        const file = item.getAsFile();
        
        // Add the file to dropzone
        dropzone.value.addFile(file);
        break;
      }
    }
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