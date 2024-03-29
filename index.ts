import {
	createSoicalImage,
	saveImageToFile,
	uploadToCloudinary,
} from './social-sharing';

const postNames = [
	'Leveraging TypeScript for Scalable Web Applications: Strategies and Best Practices',
	'Next-Gen Web Performance Optimization: Techniques for 2024',
	'Building Responsive Interfaces with React Hooks: A Comprehensive Guide',
];

async function createAndSaveLocally(name: string) {
	const canvas = await createSoicalImage(name);
	await saveImageToFile(name, canvas, 'png');
}

async function createAndUpload(name: string) {
	const canvas = await createSoicalImage(name);
	await uploadToCloudinary(canvas);
}

for (const post of postNames) {
	createAndSaveLocally(post);
}
