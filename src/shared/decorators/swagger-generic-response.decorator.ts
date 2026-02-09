import { applyDecorators, Type } from "@nestjs/common";
import { ApiOkResponse, ApiExtraModels, getSchemaPath } from "@nestjs/swagger";
import { ApiResponseDto, CountApiResponseDto } from "../dto/base-response.dto";

type ParamType = {
  isArray: boolean;
};

const params: ParamType = { isArray: false };

export const ApiSuccessResponse = <TModel extends Type<any>>(
  model: TModel,
  description = "Successful response",
  options: ParamType = params
) => {
  // Check if the model is CountApiResponseDto
  if (options.isArray) {
    return applyDecorators(
      ApiExtraModels(CountApiResponseDto, model),
      ApiOkResponse({
        description,
        schema: {
          allOf: [
            { $ref: getSchemaPath(CountApiResponseDto) },
            {
              properties: {
                data: { type: "array", items: { $ref: getSchemaPath(model) } },
                count: {
                  type: "number",
                  description: "Total count of items",
                },
              },
            },
          ],
        },
      })
    );
  }

  return applyDecorators(
    ApiExtraModels(ApiResponseDto, model),
    ApiOkResponse({
      description,
      schema: {
        allOf: [
          { $ref: getSchemaPath(ApiResponseDto) },
          {
            properties: {
              data: { $ref: getSchemaPath(model) },
            },
          },
        ],
      },
    })
  );
};
