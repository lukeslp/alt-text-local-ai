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

  dropzone.value = new Dropzone("#imageUpload", {
    url: "#",
    autoProcessQueue: false,
    createImageThumbnails: true,
    acceptedFiles: "image/*",
    addRemoveLinks: true,
    maxFiles: 1,
    maxFilesize: 5,
    dictDefaultMessage: "Drop images here or click to upload"
  });

  dropzone.value.on("addedfile", async (file) => {
    if (dropzone.value.files.length > 1) {
      dropzone.value.removeFile(dropzone.value.files[0]);
    }
    await processImage(file);
  });

  dropzone.value.on("error", (file, errorMessage) => {
    console.error('Dropzone error:', errorMessage);
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
}

:root.dark .dropzone {
  background: #1a1a1a !important;
  border-color: #4a5568 !important;
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
  margin: 1em !important;
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