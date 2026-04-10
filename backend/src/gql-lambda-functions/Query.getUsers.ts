import { UserRepository } from '../repositories/user-repository';

const ADMIN_EMAILS = ['johannes.koch@gmail.com', 'lockhead+joe1@lockhead.info'];

/**
 * Lambda resolver for Query.getUsers
 * Returns all users — admin only.
 */

interface Event {
  identity: {
    sub: string;
    claims: {
      email?: string;
    };
  };
}

export const handler = async (event: Event) => {
  const callerUserId = event.identity?.sub;

  if (!callerUserId) {
    throw new Error('Authentication required');
  }

  const callerEmail = event.identity?.claims?.email;

  if (!callerEmail || !ADMIN_EMAILS.includes(callerEmail)) {
    throw new Error('Not authorized');
  }

  const userRepo = UserRepository.getInstance();
  return userRepo.getAll();
};
