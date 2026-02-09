import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { GoogleGenerativeAI } from "@google/generative-ai";

@Injectable()
export class GeminiService {
  private genAI: GoogleGenerativeAI;
  private model: any;

  constructor(private configService: ConfigService) {
    this.genAI = new GoogleGenerativeAI(this.configService.get<string>("GEMINI_API_KEY"));
    this.model = this.genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
  }
  async analyzeTheProductImage(imageBuffer: Buffer, mimeType: string) {
    const imagePart = {
      inlineData: {
        data: imageBuffer.toString("base64"),
        mimeType,
      },
    };

    // Modified prompt to focus on pet-related products
    const prompt = `
        Analyze the product image of a pet product and provide details in the following format:
      {
        "product_name": "Name of the pet product",
        "selling_price": 49.99,
        "purchasing_price": 30.00,
        "category": "Pet Toy", 
        "quantity": 10,
        "description": "A detailed description of the pet product, emphasizing the quality, age, and condition of the used item.",
        "condition": "Used - Like New",
        "size": "M",
        "brand": "PetBrand"
      }
    `;

    // Sending the prompt and image data to the model for analysis
    const result = await this.model.generateContent([prompt, imagePart]);

    // Awaiting the result response
    const response = await result.response;
    const text = await response.text();

    let analysisResult = null;

    try {
      // Extract JSON from the text response using regex
      const jsonMatch = text.match(/```json\n([\s\S]*?)\n```/);
      const jsonString = jsonMatch ? jsonMatch[1] : text;

      // Parse the extracted JSON
      analysisResult = JSON.parse(jsonString);

      // Optionally log the analysis result
      console.log("Analysis Result:", analysisResult);
    } catch (error) {
      throw new Error(`Failed to parse the response: ${error.message}`);
    }

    // Return the parsed analysis result
    return analysisResult;
  }
}
