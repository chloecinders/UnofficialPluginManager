/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2023 Vendicated and contributors
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/

import "./style.css";

import { definePluginSettings } from "@api/Settings";
import { wrapTab } from "@components/VencordSettings/shared";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType, StartAt } from "@utils/types";
import SettingsPlugin from "plugins/_core/settings";

import UnofficialPluginsSection from "./components/UnofficialPluginsSection";

export interface PluginState {
    checkedForUpdates: boolean;
    latestHashes: Record<string, string>;
    needsUpdate: Record<string, boolean>;
}

// just using this as global state
export const settings = definePluginSettings({
    state: {
        type: OptionType.CUSTOM,
        default: {
            checkedForUpdates: false,
            latestHashes: {},
            needsUpdate: {}
        } as PluginState,
        hidden: true,
    }
});

export default definePlugin({
    name: "UnofficialPluginManager",
    description: "Allows you to easily install and manage custom plugins",
    authors: [Devs.surgedevs],
    startAt: StartAt.Init,
    enabledByDefault: true,
    settings,

    start() {
        settings.store.state = {
            checkedForUpdates: false,
            latestHashes: {},
            needsUpdate: {}
        };

        SettingsPlugin.customSections.push(sectionTypes => ({
            section: "UnofficialPlugins",
            label: "Unofficial Plugins",
            element: wrapTab(UnofficialPluginsSection, "UnofficialPlugins"),
            classname: "vc-up"
        }));
    }
});
