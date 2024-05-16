# Generating Social Images with Node and Hosting with Cloudinary

## Introduction

When you share a link on social media, the platform will often display a preview of the content. This preview usually includes a title, a description, and an image. The image is called a "social cover image" or "social card". It's a visual representation of the content you're sharing, and it's important for attracting clicks and engagement.

Creating these images manually can be time-consuming, especially if you have a lot of content to share and you want a similar style of image for each page. In this tutorial, we'll show you how to automatically generate social cover images for your blog posts using Node.js and the Cloudinary API.

Using [Cloudinary](https://cloudinary.com/), we can host our images and serve them quickly to our users. We can also use Cloudinary to optimize our images for the web, ensuring they load quickly and look great on any device. Cloudinary does the hard work of resizing, compressing, and delivering images to users for us!

## Generating Social Cover Images with Canvas

Before we can upload our social images to Cloudinary, we need to generate them! There are several ways to use web technology to generate images. Perhaps the most obvious is to use the [Canvas API](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API). With canvas, we can load images, draw shapes, write text, and create a new image file.

But there are two downsides to canvas: first, it is a browser API and we're generating in the back end with Node.js. Second, it doesn't have a native way to wrap text within a bounding box. To use canvas in Node and because it is time-consuming and challenging to implement text wrapping ourselves, we'll use the [Skia Canvas](https://github.com/samizdatco/skia-canvas) library. This library is based on Google's Skia graphics engine and re-implements and extends the canvas API for Node.js. It includes functionality for text wrapping, saving us the trouble of having to do it ourselves.

Let's start by creating a new Node.js project and installing the `skia-canvas` package.

```bash
mkdir social-image-generator
cd social-image-generator
npm init -y
npm install skia-canvas
```

Next we'll be creating a function that we'll use to generate our social image from a post name using `skia-canvas`. First, we'll import `Canvas` and create an instance to use.

```typescript
import { Canvas } from 'skia-canvas';

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
}
```

We'll use the `ctx` to draw within the canvas. First, we'll load an image for the background:

```typescript
import { Canvas, loadImage } from 'skia-canvas';

export async function createSocialImage(name: string): Promise<Canvas> {
	// ...
	const image = await loadImage('./assets/background.png');
	ctx.drawImage(image, 0, 0, width, height);
	// ...
}
```

Next, we'll get ready to draw the text. While `skia-canvas` helps with wrapping text, we still have the possibility that text could overflow the bottom of the image. To handle this, we're going to write some code to scale the text size to fit within the image. If it's not possible to fit the text without it becoming too small, we'll throw an error.

We start by setting the initial position of our text, `textX` and `textY`, and the maximum width of the text, `maxWidth`. We then load the font we want to use. In this case, we're using the [Inter](https://fonts.google.com/specimen/Inter) font, weight 600, which is available free to use from Google Fonts.

We set the font size to 96 and check if the text fits within the image. To do this, we'll use `ctx.measureText()` to get the lines of text that would be drawn and adding together their heights. If the total height of all lines of text is greater than our canvas `height` minus the vertical starting point of `textY`, we reduce the font size by 4 and check again. We continue this process until the text fits or the font size is less than 24. If the text size goes below 24 and it still doesn't fit, the text is going to be too small to look good and we'll give up by throwing an error.

Why not just set a character limit? Because you're probably going to use your own fonts and designs! Different fonts will take up different amounts of space at the same font size, so it's something you'll need to play with for yourself. A character limit won't take this into account, but actually measuring the space used by the drawn text will. When you're making your own designs, you'll have to try different font sizes and see what works best for you.

```typescript
import { Canvas, loadImage, FontLibrary } from 'skia-canvas';

export async function createSocialImage(name: string): Promise<Canvas> {
	// ...
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
	// ...
}
```

Finally, now that we've got the correct font size, we can draw our post name to the canvas. For extra readability, we'll add a mostly transparent white stroke to the black text. Once we're done drawing the text, we return the canvas from our function.

```typescript
export async function createSocialImage(name: string): Promise<Canvas> {
	// ...

	ctx.fillStyle = 'rgba(16, 15, 15, 0.9)';
	ctx.lineWidth = 6;
	ctx.strokeStyle = 'rgba(247, 238, 217, 0.2)';
	ctx.strokeText(name, textX, textY, maxWidth);
	ctx.fillText(name, textX, textY, maxWidth);

	return canvas;
}
```

## Saving Images Locally (Optional)

You'll probably want to see how your generated images look before uploading to Cloudinary, so we'll save them to our local disk first.

For naming our images, we'll use the `slugify` library and create a helper function with our chosen options. This helper, `slugifyName`, will convert our post name to a URL-friendly string. We'll then create a function, `saveImageToFile`, that will save our canvas to a file in the `images` directory of our repository. The `saveImageToFile` function will take the post name, the canvas, and the export format as arguments.

First, we'll install the `slugify` package.

```bash
npm install slugify
```

Next, we'll write the our functions.

```typescript
import { existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { ExportFormat } from 'skia-canvas';
import slugify from 'slugify';

// We're putting this into a helper function so we can easily reuse the options later.
function slugifyName(name: string) {
	return slugify(name, { lower: true, strict: true, remove: /[?&#\\%<>\+]]/g });
}

export async function saveImageToFile(
	name: string,
	canvas: Canvas,
	format: ExportFormat,
) {
	// Create the images directory if it doesn't exist.
	if (!existsSync('./images')) {
		mkdirSync('./images');
	}
	// Then we'll save our canvas image to the format of our choosing.
	// Pixel density is set to 2 to make the image look good on high-density displays.
	await canvas.saveAs(join('./images', `${slugifyName(name)}.${format}`), {
		format,
		density: 2,
	});
}
```

We've now got everything we need to generate and save our social images.

```typescript
async function createAndSaveLocally(name: string) {
	const canvas = await createSocialImage(name);
	await saveImageToFile(name, canvas, 'png');
}

createAndSaveLocally(
	'Whatever example post name you want to save to an image!',
);
```

If we run this script, it will generate our test image at `images/whatever-example-post-name-you-want-to-save-to-an-image.png`.

## Uploading to Cloudinary

Saving our images locally is really only necessary to make sure our generation script is outputting social images that look the way we want them to. We ultimately want to host our images with Cloudinary, and we don't need to save the images to disk to do that. We're next going to write a function that will upload our images to Cloudinary as buffer data, bypassing the need to save to disk first.

First, we'll install the `cloudinary` package.

```bash
npm install cloudinary
```

Next, we'll configure Cloudinary for use. We'll create a configuration file that references our Cloudinary account information, which we'll save in environment variables. We'll also create a `.env` file to store these variables.

```bash
touch .env
touch cloudinary.config.ts
```

In the `.env` file, we'll add our Cloudinary account information.

```
CLOUDINARY_CLOUD_NAME=your_cloud_name_here
CLOUDINARY_API_KEY=_your_api_key_here
CLOUDINARY_API_SECRET=your_secret_here
```

In `cloudinary.config.ts`, we'll import the `cloudinary` package and configure it with our account information.

```typescript
import { v2 as cloudinary } from 'cloudinary';
cloudinary.config({
	cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
	api_key: process.env.CLOUDINARY_API_KEY,
	api_secret: process.env.CLOUDINARY_API_SECRET,
});
export { cloudinary };
```

For more information on how to set up and use the Cloudinary Node.js SDK, see the [documentation](https://cloudinary.com/documentation/node_quickstart).

With configuration done, we can import `cloudinary` into our main script and write a function to upload our images.

```typescript
import { cloudinary } from './cloudinary.config';

export async function uploadToCloudinary(
	name: string,
	canvas: Canvas,
	format: ExportFormat,
) {
	try {
		// We'll save our images to a Cloudinary folder called 'og-images'.
		const folder = 'og-images';
		// We'll use the slugified name as the public_id.
		// Note: slugifyName was defined in the previous optional section.
		const public_id = slugifyName(name);
		// No need to save to a local file, we can upload directly to Cloudinary with a Buffer.
		const buffer = await canvas.toBuffer(format, { density: 2 });

		console.log(`Uploading ${public_id}.`);
		cloudinary.uploader
			.upload_stream(
				{
					public_id,
					folder,
					format,
					overwrite: true, // Overwrite if the image already exists.
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
	} catch (error) {
		console.error(error);
	}
}
```

This function will upload our images to Cloudinary. We'll use the slugified name as the `public_id` and save the images to a Cloudinary folder named `og-images`. We'll also overwrite the image if it already exists.

Instead of uploading a file, the function uses `canvas.toBuffer()` to get the image data as a buffer. We then use `cloudinary.uploader.upload_stream()` to upload the image to Cloudinary. We execute everything in a `try` block and catch any errors that occur, logging them to the console for review. Since this function could be used to upload many images, we don't want a single upload error to crash our script and stop all other uploads.

For more details on the Cloudinary Upload API, see the [API documentation](https://cloudinary.com/documentation/image_upload_api_reference) and the [Node.js SDK documentation](https://cloudinary.com/documentation/node_image_and_video_upload).

## Avoiding Redundant Uploads

Let's assume we'll use this script with a statically generated blog site. Our website might have dozens, hundreds, or thousands of pages. Most of the time our site is rebuilt, the content of the pages won't change. If there hasn't been any change to our social images, then we really don't need to upload them to Cloudinary at all.

To solve this problem, we'll modify our upload function to check if an image already exists in Cloudinary. If it does, we'll skip the upload. If it doesn't, we'll upload the image.

We can't just check for the image name, because we might've modified our image generation code to implement a new style. We'll need to actually check that the images are different. To do this, we'll create a unique hash from the image data and store it with our upload in the image's [context](https://cloudinary.com/documentation/image_upload_api_reference#context). Then, before we attempt an upload, we'll check if the image already exists in Cloudinary and if the hash matches.

```typescript
import { createHash } from 'crypto';

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

		// Then we'll check if an image with the same ID already exists in Cloudinary.
		const existingResources = await cloudinary.api
			.resource(`${folder}/${public_id}`, {
				context: true,
			})
			.catch(error => {
				if (error.error.http_code !== 404) {
					throw error;
				}
			});

		// If the image exists and the hashes match, the image hasn't changed!
		if (existingResources && existingResources.context?.custom?.hash === hash) {
			console.log(`No change to ${public_id}. Skipping upload.`);
			return;
		} else {
			// The upload code will execute here...
		}
	} catch (error) {
		console.error(error);
	}
}
```

### Notes on URLs and SEO

Once your images are uploaded to Cloudinary, you'll want to use the Cloudinary URLs in your site's metadata. You may not want to use the ordinary URLs generated during upload. For example, if we had a post titled "Example Post Name", our image's URL would be `https://res.cloudinary.com/{{cloudinary_cloud_name}}/image/upload/og-images/example-post-name.png`. This is long and unwieldy, and it's not great for SEO.

But, you have options! Cloudinary allows for customizing your image URLs for better SEO. Their [documentation](https://cloudinary.com/blog/how_to_dynamically_create_seo_friendly_urls_for_your_site_s_images) explains how to do this. You can modify URLs to not need `image/upload`, to include dynamic SEO suffixes, or to use your own domain.
