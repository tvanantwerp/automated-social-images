import { Canvas, loadImage, ExportFormat, FontLibrary } from 'skia-canvas';
import { cloudinary } from './cloudinary.config';

// We're using skia-canvas to create an image instead of native canvas.
// This is to make it easier to wrap text, which native canvas doesn't
// support out-of-the-box.

export async function createSoicalImage(name: string): Promise<Canvas> {
	// Most social media platforms have and image ratio of 1.91:1.
	// Facebook recommends 1200x630, X/Twitter 800x418, LinkedIn 1200x627.
	// Facebook's recommendation will work well for all platforms, so we'll use that.
	// These dimensions were chosen in March, 2024. They may change in the future.
	const canvas = new Canvas(1200, 630);
	const { width, height } = canvas;
	const ctx = canvas.getContext('2d');

	// Draw the background image.
	const image = await loadImage('./assets/background.png');
	ctx.drawImage(image, 0, 0, width, height);

	// Load the Inter font, weight 600, available on Google Fonts.
	FontLibrary.use(['./assets/Inter-SemiBold.ttf']);
	ctx.font = '48px Inter';

	// Write the title of the shared webpage.
	ctx.fillStyle = '#333';
	ctx.textWrap = true;
	ctx.fillText(name, 50, 100, width - 100);

	return canvas;
}

export async function saveImageToFile(
	name: string,
	canvas: Canvas,
	format: ExportFormat,
) {
	await canvas.saveAs(name, { format });
}

export async function uploadToCloudinary(canvas: Canvas) {
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
