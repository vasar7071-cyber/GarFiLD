using Oxide.Core;
using System.Collections.Generic;
using UnityEngine;

namespace Oxide.Plugins
{
    [Info("SetHome", "Helper", "1.0.0")]
    [Description("Позволяет ставить, удалять и телепортироваться к домам (homes) для игроков Rust via uMod/Oxide.")]
    public class SetHome : RustPlugin
    {
        class StoredData
        {
            public Dictionary<ulong, Dictionary<string, float[]>> Homes = new Dictionary<ulong, Dictionary<string, float[]>>();
        }

        private StoredData data;

        void Init()
        {
            LoadData();
        }

        void LoadData()
        {
            data = Interface.Oxide.DataFileSystem.ReadObject<StoredData>(Name) ?? new StoredData();
        }

        void SaveData()
        {
            Interface.Oxide.DataFileSystem.WriteObject(Name, data);
        }

        [ChatCommand("sethome")]
        void SetHomeCmd(BasePlayer player, string cmd, string[] args)
        {
            if (player == null) return;
            string name = args.Length > 0 ? args[0].ToLower() : "home";
            var pos = player.transform.position;
            ulong id = player.userID;
            if (!data.Homes.ContainsKey(id)) data.Homes[id] = new Dictionary<string, float[]>();
            data.Homes[id][name] = new float[] { pos.x, pos.y, pos.z };
            SaveData();
            SendReply(player, $"Дом '{name}' установлен.");
        }

        [ChatCommand("home")]
        void HomeCmd(BasePlayer player, string cmd, string[] args)
        {
            if (player == null) return;
            string name = args.Length > 0 ? args[0].ToLower() : "home";
            ulong id = player.userID;
            if (!data.Homes.ContainsKey(id) || !data.Homes[id].ContainsKey(name))
            {
                SendReply(player, $"Дом '{name}' не найден.");
                return;
            }
            float[] arr = data.Homes[id][name];
            Vector3 pos = new Vector3(arr[0], arr[1], arr[2]);
            player.Teleport(pos);
            SendReply(player, $"Телепортирован(а) к дому '{name}'.");
        }

        [ChatCommand("delhome")]
        void DelHomeCmd(BasePlayer player, string cmd, string[] args)
        {
            if (player == null) return;
            string name = args.Length > 0 ? args[0].ToLower() : "home";
            ulong id = player.userID;
            if (!data.Homes.ContainsKey(id) || !data.Homes[id].ContainsKey(name))
            {
                SendReply(player, $"Дом '{name}' не найден.");
                return;
            }
            data.Homes[id].Remove(name);
            if (data.Homes[id].Count == 0) data.Homes.Remove(id);
            SaveData();
            SendReply(player, $"Дом '{name}' удалён.");
        }

        [ChatCommand("homes")]
        void HomesCmd(BasePlayer player, string cmd, string[] args)
        {
            if (player == null) return;
            ulong id = player.userID;
            if (!data.Homes.ContainsKey(id) || data.Homes[id].Count == 0)
            {
                SendReply(player, "У вас нет сохранённых домов.");
                return;
            }
            var keys = new List<string>(data.Homes[id].Keys);
            SendReply(player, "Дома: " + string.Join(", ", keys));
        }
    }
}
