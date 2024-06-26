import { existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { createHash } from 'crypto';
import slugify from 'slugify';
import { Canvas, loadImage, ExportFormat, FontLibrary } from 'skia-canvas';
import { cloudinary } from './cloudinary.config';

// We're using skia-canvas to create an image instead of native canvas.
// This is to make it easier to wrap text, which native canvas doesn't
// support out-of-the-box.

export async function createSocialImage(name: string): Promise<Canvas> {
	// Most social media platforms have an image ratio of 1.91:1.
	// Facebook recommends 1200x630, X/Twitter 800x418, LinkedIn 1200x627.
	// Facebook's recommendation will work well for all platforms, so we'll use that.
	// These dimensions were chosen in May, 2024. They may change in the future.
	const canvas = new Canvas(1200, 630);
	const { width, height } = canvas;
	const ctx = canvas.getContext('2d');

	// Draw the background image.
	const image = await loadImage('./assets/background.png');
	ctx.drawImage(image, 0, 0, width, height);

	const textX = 50;
	const textY = 100;
	const maxWidth = width - textX * 2;

	// Load the Inter font, weight 600, available on Google Fonts.
	FontLibrary.use(['./assets/Inter-SemiBold.ttf']);
	ctx.textWrap = true;
	let fontSize = 96;
	let textFits = false;
	while (!textFits && fontSize >= 24) {
		ctx.font = `${fontSize}px Inter`;
		const metrics = ctx.measureText(name, maxWidth - textX);
		let totalTextHeight = metrics.lines.reduce(
			(acc, line) => acc + line.height,
			0,
		);
		if (totalTextHeight > height - textY) {
			fontSize -= 4;
		} else {
			textFits = true;
		}
	}

	if (!textFits && fontSize < 24) {
		throw new Error('Text is too long to fit on the image.');
	}

	// Write the title of the shared webpage.
	ctx.fillStyle = 'rgba(16, 15, 15, 0.9)';
	ctx.lineWidth = 6;
	ctx.strokeStyle = 'rgba(247, 238, 217, 0.2)';
	ctx.strokeText(name, textX, textY, maxWidth);
	ctx.fillText(name, textX, textY, maxWidth);

	return canvas;
}

function slugifyName(name: string) {
	return slugify(name, { lower: true, strict: true, remove: /[?&#\\%<>\+]]/g });
}

export async function saveImageToFile(
	name: string,
	canvas: Canvas,
	format: ExportFormat,
) {
	if (!existsSync('./images')) {
		mkdirSync('./images');
	}
	await canvas.saveAs(join('./images', `${slugifyName(name)}.${format}`), {
		format,
		density: 2,
	});
}

function getImageHash(buffer: Buffer) {
	return createHash('md5').update(buffer).digest('hex');
}

export async function uploadToCloudinary(
	name: string,
	canvas: Canvas,
	format: ExportFormat,
) {
	try {
		const folder = 'og-images';
		// We'll use the slugified name as the public_id.
		const public_id = slugifyName(name);
		// No need to save to a local file, we can upload directly to Cloudinary with a Buffer.
		const buffer = await canvas.toBuffer(format, { density: 2 });

		// We'll use the hash of the image to prevent duplicates.
		const hash = getImageHash(buffer);

		const existingResources = await cloudinary.api
			.resource(`${folder}/${public_id}`, {
				context: true,
			})
			.catch(error => {
				if (error.error.http_code !== 404) {
					throw error;
				}
			});
		if (existingResources && existingResources.context?.custom?.hash === hash) {
			console.log(`No change to ${public_id}. Skipping upload.`);
			return;
		} else {
			console.log(`Uploading ${public_id}.`);
			cloudinary.uploader
				.upload_stream(
					{
						public_id,
						folder,
						format,
						overwrite: true,
						context: `hash=${hash}`,
					},
					(err, _) => {
						if (err) {
							throw new Error(`Failed to upload image for "${name}"`, {
								cause: err,
							});
						}
					},
				)
				.end(buffer);
		}
	} catch (error) {
		console.error(error);
	}
}
