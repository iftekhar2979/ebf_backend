// src/settings/settings.controller.ts
import { Controller, Get, Param, Put, Body, Render } from "@nestjs/common";
import { SettingsService } from "./settings.service";
import { unescapeHtml } from "src/utils/unScapeHtml";

@Controller("settings")
export class SettingsController {
  constructor(private readonly _settingsService: SettingsService) {}
  @Get("instructions")
  @Render("instruction")
  getInstruction() {
    return {
      title: "Instructions",
      content: "This is a static instruction page.",
    };
  }
  @Get()
  getAll() {
    return this._settingsService.getAll();
  }
  @Get(":key")
  getByKey(@Param("key") key: string) {
    return this._settingsService.getSettingByKey(key);
  }
  @Get(":key/preview")
  @Render("privacy")
  async getPrivacyPolicy(@Param("key") key: string) {
    const content = await this._settingsService.getRawSettingKey(key);
    return { content: unescapeHtml(content) };
  }

  @Put(":key")
  updateSetting(@Param("key") key: string, @Body("content") content: string) {
    return this._settingsService.updateSetting(key, content);
  }
}
