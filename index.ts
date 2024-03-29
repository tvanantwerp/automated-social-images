import { Canvas } from 'skia-canvas';
import { cloudinary } from './cloudinary.config';

// Most social media platforms have and image ratio of 1.91:1.
// Facebook recommends 1200x630, X/Twitter 800x418, LinkedIn 1200x627.
// Facebook's recommendation will work well for all platforms, so we'll use that.
// These dimensions were chosen in March, 2024. They may change in the future.
const canvas = new Canvas(1200, 630);
const { width, height } = canvas;
const ctx = canvas.getContext('2d');

async function render() {
	// "Save" the canvas to a Node Buffer.
	const buffer = await canvas.toBuffer('png');
	// Upload the buffer to Cloudinary.
	cloudinary.uploader
		.upload_stream({}, (err, res) => {
			if (err) {
				console.error(err);
				return;
			}
			console.log(res);
		})
		.end(buffer);
}
