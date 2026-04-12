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

  const userRepo = UserRepository.getInstance();

  let callerEmail = event.identity?.claims?.email;
  console.log('[AdminAuth] getUsers — callerUserId:', callerUserId, 'jwtEmail:', callerEmail);
  if (!callerEmail) {
    console.log('[AdminAuth] JWT email claim missing, falling back to DB lookup');
    const callerUser = await userRepo.getById(callerUserId);
    callerEmail = callerUser?.email;
    console.log('[AdminAuth] DB email lookup result:', callerEmail);
  }
  const isAdmin = callerEmail != null && ADMIN_EMAILS.includes(callerEmail);
  console.log('[AdminAuth] email:', callerEmail, 'isAdmin:', isAdmin);
  if (!callerEmail || !isAdmin) {
    console.warn('[AdminAuth] DENIED — getUsers');
    throw new Error('Not authorized');
  }
  console.log('[AdminAuth] GRANTED — listing all users');

  return userRepo.getAll();
};
