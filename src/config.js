export const CONFIG = {
    API_KEY: "771b0d19-3723-4f85-a5e5-ab43daccc088",
    INTERNAL_TOKEN: "e1c9_5554f9913726b6e2563b78e8200c5e5b",
    INTERNAL_USER_ID: "55e4de47d26f276304fcc222",

    // Championship IDs and Metadata
    CHAMPIONSHIPS: [
        {
            _id: "6598143af1e53905facfcc6d",
            name: "Champions Fuentmondo (1a Div)",
            dataSourceChamp: "espana",
            userteamId: "65981926d220e05de3fdc762",
            type: "league"
        },
        {
            _id: "65981dd8f1fa9605fbefe305",
            name: "La Liga ML (2a Div)",
            dataSourceChamp: "espana",
            type: "league"
        },
        {
            _id: "697663371311f0fd5379a446",
            name: "COPA PIRAÑA",
            dataSourceChamp: "espana",
            userteamId: "69766337c15cdb2bd57b94c0",
            type: "copa"
        }
    ],

    // Sanction Rules
    SANCTION_RULES: {
        matches_out: 3,
        matches_no_captain: 6,
        captaincy_threshold: 3
    },

    // WhatsApp Bot Config
    WHATSAPP: {
        groupName: "FuentmondoBOT",
        bridgeUrl: "http://localhost:3001"
    }
};
