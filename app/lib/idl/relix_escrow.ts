/**
 * Program IDL in camelCase format in order to be used in JS/TS.
 *
 * Note that this is only a type helper and is not the actual IDL. The original
 * IDL can be found at `target/idl/relix_escrow.json`.
 */
export type RelixEscrow = {
  "address": "8dBQUA3ja6Z82oZ5C4qEmTg5CJ3jRtvnMb48h4vL1jgK",
  "metadata": {
    "name": "relixEscrow",
    "version": "0.1.0",
    "spec": "0.1.0",
    "description": "Relix native SOL escrow MVP"
  },
  "instructions": [
    {
      "name": "initializeEscrow",
      "discriminator": [
        243,
        160,
        77,
        153,
        11,
        92,
        48,
        209
      ],
      "accounts": [
        {
          "name": "founder",
          "writable": true,
          "signer": true
        },
        {
          "name": "escrow",
          "writable": true,
          "signer": true
        },
        {
          "name": "vault",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  114,
                  101,
                  108,
                  105,
                  120,
                  95,
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "escrow"
              }
            ]
          }
        },
        {
          "name": "specialist"
        },
        {
          "name": "treasury"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "jobId",
          "type": "string"
        },
        {
          "name": "totalAmountLamports",
          "type": "u64"
        },
        {
          "name": "feeBps",
          "type": "u16"
        },
        {
          "name": "deadlineUnix",
          "type": "i64"
        }
      ]
    },
    {
      "name": "refundEscrow",
      "discriminator": [
        107,
        186,
        89,
        99,
        26,
        194,
        23,
        204
      ],
      "accounts": [
        {
          "name": "founder",
          "writable": true,
          "signer": true,
          "relations": [
            "escrow"
          ]
        },
        {
          "name": "escrow",
          "writable": true
        },
        {
          "name": "vault",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  114,
                  101,
                  108,
                  105,
                  120,
                  95,
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "escrow"
              }
            ]
          }
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": []
    },
    {
      "name": "releaseEscrow",
      "discriminator": [
        146,
        253,
        129,
        233,
        20,
        145,
        181,
        206
      ],
      "accounts": [
        {
          "name": "founder",
          "signer": true,
          "relations": [
            "escrow"
          ]
        },
        {
          "name": "escrow",
          "writable": true
        },
        {
          "name": "vault",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  114,
                  101,
                  108,
                  105,
                  120,
                  95,
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "escrow"
              }
            ]
          }
        },
        {
          "name": "specialist",
          "writable": true
        },
        {
          "name": "treasury",
          "writable": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": []
    }
  ],
  "accounts": [
    {
      "name": "escrow",
      "discriminator": [
        31,
        213,
        123,
        187,
        186,
        22,
        218,
        155
      ]
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "invalidJobId",
      "msg": "Job id is required and must fit in the escrow account."
    },
    {
      "code": 6001,
      "name": "invalidTotalAmount",
      "msg": "Total amount must be greater than zero."
    },
    {
      "code": 6002,
      "name": "feeTooHigh",
      "msg": "Fee basis points cannot exceed the Relix escrow cap."
    },
    {
      "code": 6003,
      "name": "specialistAmountZero",
      "msg": "Specialist amount must be greater than zero."
    },
    {
      "code": 6004,
      "name": "invalidSpecialistWallet",
      "msg": "Specialist wallet cannot be the default public key."
    },
    {
      "code": 6005,
      "name": "invalidTreasuryWallet",
      "msg": "Treasury wallet cannot be the default public key."
    },
    {
      "code": 6006,
      "name": "mathOverflow",
      "msg": "Escrow math overflowed."
    },
    {
      "code": 6007,
      "name": "unauthorizedFounder",
      "msg": "Only the escrow founder can perform this action."
    },
    {
      "code": 6008,
      "name": "alreadyReleased",
      "msg": "Escrow was already released."
    },
    {
      "code": 6009,
      "name": "alreadyRefunded",
      "msg": "Escrow was already refunded."
    },
    {
      "code": 6010,
      "name": "deadlineNotReached",
      "msg": "Refund is only available after the escrow deadline."
    },
    {
      "code": 6011,
      "name": "insufficientVaultFunds",
      "msg": "Vault does not hold enough lamports for this escrow."
    },
    {
      "code": 6012,
      "name": "vaultAlreadyFunded",
      "msg": "Vault already holds lamports before escrow initialization."
    },
    {
      "code": 6013,
      "name": "invalidSpecialistAccount",
      "msg": "Specialist account does not match this escrow."
    },
    {
      "code": 6014,
      "name": "invalidTreasuryAccount",
      "msg": "Treasury account does not match this escrow."
    }
  ],
  "types": [
    {
      "name": "escrow",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "jobId",
            "type": "string"
          },
          {
            "name": "founder",
            "type": "pubkey"
          },
          {
            "name": "specialist",
            "type": "pubkey"
          },
          {
            "name": "treasury",
            "type": "pubkey"
          },
          {
            "name": "totalAmountLamports",
            "type": "u64"
          },
          {
            "name": "specialistAmountLamports",
            "type": "u64"
          },
          {
            "name": "treasuryFeeLamports",
            "type": "u64"
          },
          {
            "name": "feeBps",
            "type": "u16"
          },
          {
            "name": "deadlineUnix",
            "type": "i64"
          },
          {
            "name": "status",
            "type": {
              "defined": {
                "name": "escrowStatus"
              }
            }
          },
          {
            "name": "createdAt",
            "type": "i64"
          },
          {
            "name": "vaultBump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "escrowStatus",
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "funded"
          },
          {
            "name": "released"
          },
          {
            "name": "refunded"
          }
        ]
      }
    }
  ]
};
