import {
	createSocialImage,
	saveImageToFile,
	uploadToCloudinary,
} from './social-sharing';

const postNames = [
	'Example post name',
	'Another test',
	'Whatever example post name you want to save to an image!',
	'Leveraging TypeScript for Scalable Web Applications: Strategies and Best Practices',
	'Next-Gen Web Performance Optimization: Techniques for 2024',
	'Building Responsive Interfaces with React Hooks: A Comprehensive Guide',
	'Maximizing User Experience with Advanced CSS Techniques: A Deep Dive into Animation, Grids, and Flexbox for Web Developers',
	'From Monolith to Microservices: A Detailed Roadmap for Transitioning Your Web Architecture for Scalability and Maintainability',
	'Empowering Real-Time Web Applications with WebSocket: Architectural Patterns, Security Best Practices, and Performance Optimization Strategies',
];

async function createAndSaveLocally(name: string) {
	const canvas = await createSocialImage(name);
	await saveImageToFile(name, canvas, 'png');
}

async function createAndUpload(name: string) {
	const canvas = await createSocialImage(name);
	await uploadToCloudinary(name, canvas, 'png');
}

for (const post of postNames) {
	createAndSaveLocally(post);
	createAndUpload(post);
}
