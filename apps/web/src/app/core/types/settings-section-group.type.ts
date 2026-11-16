import {SettingsSection} from '../models/settings-section.model';

export type SettingsSectionGroup = {
  heading: string;
  sections: readonly SettingsSection[];
};
