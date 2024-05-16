# Auto-generating Social Cover Images with Node and Hosting with Cloudinary

## Introduction

## Generating Social Cover Images with Canvas

There are several ways to use web technology to generate images. Perhaps the most obvious is to use the [Canvas API](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API). With canvas, we can load images, draw shapes, write text, and create a new image file.

But one of the major downsides of canvas for our purposes is that it doesn't have a native way to wrap text within a bounding box. Because it is time-consuming and challenging to implement this ourselves, we'll instead use the [Skia Canvas](https://github.com/samizdatco/skia-canvas) library. This library is based on Google's Skia graphics engine and re-implements and extends the canvas API for Node.js. It includes functionality for text wrapping, saving us the trouble of having to do it ourselves.

Let's start by creating a function that we'll use to generate our social image from a post name using `skia-canvas`. First, we'll import `Canvas` and create an instance to use.

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

We start by setting the initial position of our text, `textX` and `textY`, and the maximum width of the text, `maxWidth`. We then load the font we want to use. In this case, we're using the Inter font, weight 600, which is available free to use from Google Fonts.

We set the font size to 96 and check if the text fits within the image. To do this, we'll use `ctx.measureText()` to get the lines of text that would be drawn and adding together their heights. If the total height of all lines of text is greater than our canvas `height` minus the vertical starting point of `textY`, we reduce the font size by 4 and check again. We continue this process until the text fits or the font size is less than 24. If the text size goes below 24 and it still doesn't fit, the text is going to be too small to look good and we'll give up by throwing an error.

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

```typescript
import { existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { ExportFormat } from 'skia-canvas';
import slugify from 'slugify';

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
	await canvas.saveAs(join('./images', `${slugifyName(name)}.png`), {
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

## Hosting with Cloudinary

### Notes on URLs and SEO

<!-- Link out to docs here -->
