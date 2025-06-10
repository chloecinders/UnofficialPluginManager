/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { DataStore } from "@api/index";
import { Grid } from "@components/Grid";
import { PluginNative } from "@utils/types";
import { useCallback, useEffect, useRef, useState } from "@webpack/common";

import Plugins from "~plugins";

import { PartialOrNot, PartialPlugin, PLUGINS_STORE_KEY, StoredPlugin } from "../shared";
import PluginItem from "./PluginItem";

const Native = VencordNative.pluginHelpers.UnofficialPluginManager as PluginNative<typeof import("../native")>;

interface Plugin {
    name: string;
    folderName: string;
    source?: "link" | "directory";
    repoLink?: string;
    partial?: boolean;
    commitHash?: string;
    needsUpdate?: boolean;
}

export default function PluginList({
    partialPlugins,
    onUpdateCheck,
    onLoadingChange
}: {
    partialPlugins: PartialPlugin[];
    onUpdateCheck?: (hasUpdates: boolean, isChecking?: boolean) => void;
    onLoadingChange: (loading: boolean, text?: string) => void;
}) {
    const [plugins, setPlugins] = useState<Plugin[]>([]);
    const [error, setError] = useState<string | null>(null);
    const isInitialMount = useRef(true);

    const checkForUpdates = useCallback(async (pluginList: Plugin[]) => {
        onLoadingChange(true, "Checking for updates...");
        setError(null);

        try {
            const updatedPlugins = await Promise.all(pluginList.map(async plugin => {
                if (plugin.source !== "link") return plugin;

                const data = await DataStore.get(PLUGINS_STORE_KEY);

                if (!data) return plugin;

                const folderName = data.find(p => p.name === plugin.name).folderName || plugin.folderName;

                const result = await Native.checkPluginUpdates(folderName);

                if (!result.success) {
                    console.error(`Failed to check updates for ${plugin.name}:`, result.error);
                    return plugin;
                }

                return {
                    ...plugin,
                    needsUpdate: result.data?.needsUpdate ?? false,
                    commitHash: result.data?.currentHash
                };
            }));

            setPlugins(updatedPlugins);
            const hasUpdates = updatedPlugins.some(p => p.needsUpdate);
            onUpdateCheck?.(hasUpdates, false);
        } catch (err) {
            setError("Failed to check for updates");
            console.error("Update check failed:", err);
        } finally {
            onLoadingChange(false);
        }
    }, []);

    useEffect(() => {
        let mounted = true;

        async function initializePlugins() {
            try {
                onLoadingChange(true, "Loading plugins...");
                setError(null);

                const result = await Native.getPluginList();

                if (!result.success) {
                    throw new Error(result.error?.message || "Failed to get plugin list");
                }

                if (!mounted) return;

                const pluginList: (StoredPlugin | PartialPlugin)[] = [];
                const storedPlugins: StoredPlugin[] = await DataStore.get(PLUGINS_STORE_KEY) || [];

                storedPlugins.forEach(plugin => {
                    pluginList.push({
                        name: plugin.name,
                        folderName: plugin.folderName,
                        source: plugin.source,
                        repoLink: plugin?.repoLink,
                        commitHash: plugin?.commitHash
                    });
                });

                result?.data?.forEach(plugin => {
                    const existingPlugin = pluginList.find(p => p.name === plugin.pluginName);

                    if (!existingPlugin) {
                        pluginList.push({
                            name: plugin.pluginName,
                            folderName: plugin.folderName,
                            source: "directory",
                            partial: true
                        } as PartialPlugin);
                    }
                });

                Object.values(Plugins).forEach(plugin => {
                    const existingPlugin = pluginList.find(p => p.name === plugin.name) as PartialPlugin;

                    if (existingPlugin) {
                        delete existingPlugin.partial;
                        (existingPlugin as StoredPlugin).description = plugin.description;
                    }
                });

                if (!mounted) return;

                setPlugins(pluginList);

                if (isInitialMount.current) {
                    isInitialMount.current = false;
                    await checkForUpdates(pluginList);
                }
            } catch (err) {
                if (!mounted) return;
                setError("Failed to load plugins");
                console.error("Plugin initialization failed:", err);
            } finally {
                if (mounted) {
                    onLoadingChange(false);
                }
            }
        }

        initializePlugins();

        return () => {
            mounted = false;
        };
    }, [partialPlugins]);

    const handleUpdate = useCallback((pluginName: string) => {
        setPlugins(prev => prev.map(p =>
            p.name === pluginName ? { ...p, needsUpdate: false } : p
        ));
    }, []);

    const handleDelete = useCallback((pluginName: string) => {
        setPlugins(prev => prev.filter(p => p.name !== pluginName));
    }, []);

    if (error) {
        return (
            <div style={{ color: "var(--text-danger)", padding: "1rem" }}>
                {error}
            </div>
        );
    }

    return (
        <div style={{ position: "relative" }}>
            <Grid columns={2} gap={"16px"}>
                {plugins.map(plugin => (
                    <PluginItem
                        key={plugin.name}
                        plugin={plugin as PartialOrNot}
                        onUpdate={handleUpdate}
                        onDelete={handleDelete}
                    />
                ))}
            </Grid>
        </div>
    );
}
