import express, { request } from "express";
import crypto from 'crypto';

const encoder = new TextEncoder();

export default class WebServer {
	constructor(port, client) {
		this.port = port;
		this.client = client;
		this.router = express();

		this.router.use(express.json());

		this.router.post("/", (req, res) => {
			return this.handleRequest(req, res);
		});
	}

	async start() {
		await this.router.listen(this.port, () =>
			this.client.console.success(
				`Listening for requests on port ${this.port}!`
			)
		);
	}

	async handleRequest(req, res) {
		if (
			!req.headers["x-signature-ed25519"] ||
			!req.headers["x-signature-timestamp"]
		)
			return res.redirect("https://truthordarebot.xyz");

		
	}

	async verifyRequest(req) {
		const signature = this.client.functions.hex2bin(req.headers['x-signature-ed25519']);
		const timestamp = req.headers['x-signature-timestamp'];
		const unknown = await req.clone().text();

		return await crypto.subtle.verify(
			'NODE-ED25519',
			await this.client.PUBLIC_KEY,
			signature,
			encoder.encode(timestamp + unknown)
		)
	}
}
