import { ref } from 'vue';
import { useStore } from '../store';
import { resizeImage } from '../utils/imageUtils';

/**
 * Provide methods to resize images and generate alt text.
 * @returns {object}
 */
export function useImageProcessing() {
  const store = useStore();
  const processing = ref(false);

  async function processImage(file) {
    const resultId = store.nextResultId;
    processing.value = true;

    try {
      // Create initial result object
      const result = {
        id: resultId,
        image: await resizeImage(file),
        processing: true,
        altText: null,
        error: null,
        processingSteps: {
          resize: false,
          upload: false,
          generate: false
        }
      };

      // Add to store
      store.addResult(result);
      store.addFeedMessage(`Processing image: ${file.name}`, 'info');

      // Update processing steps
      result.processingSteps.resize = true;
      store.addFeedMessage('Image resized and optimized', 'info');

      result.processingSteps.upload = true;
      store.addFeedMessage('Uploading to AI model...', 'info');

      // Generate alt text
      result.processingSteps.generate = true;
      const response = await store.generateAltText(result.image);
      
      // Update result
      result.altText = store.cleanDescription(response.response);
      result.processing = false;
      
      // Force store update
      store.updateResult(result);
      store.addFeedMessage(`Completed processing: ${file.name}`, 'success');

    } catch (err) {
      console.error('Error processing image:', err);
      store.addFeedMessage(`Error processing ${file.name}: ${err.message}`, 'error');
      store.removeResult(resultId);
    } finally {
      processing.value = false;
    }
  }

  return {
    processing,
    processImage
  };
} 