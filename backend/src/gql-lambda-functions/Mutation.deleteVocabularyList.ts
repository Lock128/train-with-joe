import { VocabularyListRepository } from '../repositories/vocabulary-list-repository';
import { PricingService } from '../services/pricing-service';

/**
 * Lambda resolver for Mutation.deleteVocabularyList
 * Deletes a vocabulary list owned by the authenticated user
 */

interface Event {
  arguments: {
    id: string;
  };
  identity: {
    sub: string;
  };
}

export const handler = async (event: Event) => {
  const userId = event.identity?.sub;
  const { id } = event.arguments;

  if (!userId) {
    return {
      success: false,
      vocabularyList: null,
      error: 'Authentication required',
    };
  }

  if (!id) {
    return {
      success: false,
      vocabularyList: null,
      error: 'Vocabulary list ID is required',
    };
  }

  try {
    const repository = VocabularyListRepository.getInstance();
    const vocabularyList = await repository.getById(id);

    if (!vocabularyList) {
      return {
        success: false,
        vocabularyList: null,
        error: 'Vocabulary list not found',
      };
    }

    // Authorization check: verify the list belongs to the requesting user
    if (vocabularyList.userId !== userId) {
      return {
        success: false,
        vocabularyList: null,
        error: 'Vocabulary list not found',
      };
    }

    await repository.delete(id);

    // Decrement vocabulary list usage counter after successful deletion
    try {
      const pricingService = PricingService.getInstance();
      await pricingService.decrementVocabularyListCount(userId);
    } catch (counterError) {
      console.warn('Failed to decrement vocabulary list counter:', counterError);
      // Don't fail the deletion if counter decrement fails
    }

    return {
      success: true,
      vocabularyList,
      error: null,
    };
  } catch (error) {
    console.error('Error deleting vocabulary list:', error);
    return {
      success: false,
      vocabularyList: null,
      error: error instanceof Error ? error.message : 'Failed to delete vocabulary list',
    };
  }
};
