// src/settings/settings.service.ts
import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Setting } from "./entity/settings.entity";

@Injectable()
export class SettingsService {
  constructor(
    @InjectRepository(Setting)
    private readonly _settingsRepo: Repository<Setting>
  ) {}

  async getSettingByKey(key: string): Promise<Setting> {
    const setting = await this._settingsRepo.findOne({ where: { key } });
    if (!setting) throw new NotFoundException(`Setting '${key}' not found`);

    return setting;
  }
  async getRawSettingKey(key: string): Promise<string> {
    const setting = await this._settingsRepo.findOne({ where: { key } });
    if (!setting) throw new NotFoundException(`Setting '${key}' not found`);
    // console.log(setting.content);
    return setting.content;
  }

  async updateSetting(key: string, content: string): Promise<Setting> {
    let setting = await this._settingsRepo.findOne({ where: { key } });

    if (!setting) {
      setting = this._settingsRepo.create({ key, content });
    } else {
      setting.content = content;
    }

    return this._settingsRepo.save(setting);
  }

  async getAll(): Promise<Setting[]> {
    return this._settingsRepo.find();
  }
}
