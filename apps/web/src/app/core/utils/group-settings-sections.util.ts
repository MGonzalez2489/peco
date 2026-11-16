import {SettingsSection} from '../models/settings-section.model';
import {SettingsSectionGroup} from '../types/settings-section-group.type';

export function groupSettingsSections(
  sections: readonly SettingsSection[],
): readonly SettingsSectionGroup[] {
  const groups: SettingsSectionGroup[] = [];
  const sectionsByHeading = new Map<string, SettingsSection[]>();

  for (const section of sections) {
    const heading = section.categoryGroup ?? '';
    let bucket = sectionsByHeading.get(heading);

    if (!bucket) {
      bucket = [];
      sectionsByHeading.set(heading, bucket);
      groups.push({heading, sections: bucket});
    }

    bucket.push(section);
  }

  return groups;
}
