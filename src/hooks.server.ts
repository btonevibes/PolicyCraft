import { authenticateUser } from '$lib/auth';
import { db, auth } from '$lib/firebase';
import { redirect, type Handle } from '@sveltejs/kit';
import { doc, getDoc } from 'firebase/firestore';
import { building } from '$app/environment';

export const handle: Handle = async ({ event, resolve }) => {
        if (!building) {
                // Stage 1
                event.locals.user = await authenticateUser(event);

                if (event.route.id?.includes('(authed)')) {
                        if (!event.locals.user) {
                                throw redirect(303, '/login');
                        }
                        // if (auth.currentUser?.emailVerified !== true) {
                        //      throw redirect(303, '/verify');
                        // }
                }

                const docSnap = await getDoc(doc(db, 'meta', 'code'));
                if (docSnap.exists()) {
                        event.locals.stage = docSnap.data().stage;
                } else {
                        event.locals.stage = null;
                }
        } else {
                event.locals.user = null;
                event.locals.stage = null;
        }

        // Stage 2
        const response = await resolve(event);

        // Stage 3
        return response;
};
