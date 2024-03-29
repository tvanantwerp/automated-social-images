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

for (const post of postNames) {
	const canvas = createSoicalImage(post);
	saveImageToFile(post, canvas);
	// uploadToCloudinary(canvas);
}
