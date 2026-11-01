/**
 * @param {import('firebase/auth').Auth} auth
 * @param {typeof import('firebase/auth').signInWithEmailAndPassword} signIn
 * @param {{email: string | undefined, password: string | undefined, uid: string | undefined}} credentials
 */
export function createServiceAuthenticator(auth, signIn, credentials) {
	/** @type {Promise<import('firebase/auth').User> | undefined} */
	let pending;
	return async () => {
		if (!credentials.email || !credentials.password || !credentials.uid) {
			throw new Error('Firebase service account is not configured');
		}
		if (auth.currentUser?.uid === credentials.uid) return auth.currentUser;
		if (!pending) {
			pending = signIn(auth, credentials.email, credentials.password)
				.then(({ user }) => {
					if (user.uid !== credentials.uid) throw new Error('Firebase service account mismatch');
					return user;
				})
				.finally(() => {
					pending = undefined;
				});
		}
		return pending;
	};
}
