export type Reason = {
	id: string;
	label: string | undefined;
	description: string;
	likeList: string[];
	userId: string;
	targetEntity?: string;
	targetEntityId?: string;
};

export type CaseSummary = {
	id: string;
	title: string;
	description: string;
	reasons: Reason[];
	votes: { allow: string[]; disallow: string[]; unsure: string[] };
	label?: string;
};

export type Discussion = {
	id: string;
	title: string;
	open: boolean;
	userId: string;
	comments: Array<{ userId: string; message: string }>;
};
