/// <reference types="tree-sitter-cli/dsl" />
// @ts-check

module.exports = grammar({
  name: "baboon",

  extras: ($) => [/\s/, $.comment, $.block_comment],

  word: ($) => $.identifier,

  rules: {
    source_file: ($) =>
      seq(
        $.model_decl,
        $.version_decl,
        optional($.import_decl),
        repeat(choice($.include_decl, $._definition))
      ),

    // Header declarations
    model_decl: ($) => seq("model", $.scoped_identifier),

    version_decl: ($) => seq("version", $.string_literal),

    include_decl: ($) => seq("include", $.string_literal),

    import_decl: ($) =>
      seq(
        "import",
        $.string_literal,
        "{",
        "*",
        "}",
        optional(seq("without", "{", repeat($.identifier), "}"))
      ),

    // Top-level definitions
    _definition: ($) =>
      choice(
        $.data_def,
        $.adt_def,
        $.enum_def,
        $.contract_def,
        $.foreign_def,
        $.service_def,
        $.namespace_def
      ),

    // Data/struct definition
    data_def: ($) =>
      seq(
        optional("root"),
        choice("data", "struct"),
        field("name", $.identifier),
        optional($.derivations),
        optional($.contract_refs),
        "{",
        repeat($._dto_member),
        "}"
      ),

    // ADT definition
    adt_def: ($) =>
      seq(
        optional("root"),
        "adt",
        field("name", $.identifier),
        optional($.derivations),
        optional($.contract_refs),
        "{",
        repeat($._adt_member),
        "}"
      ),

    _adt_member: ($) =>
      choice($.data_def, $.contract_def, $.contract_ref),

    // Enum definition
    enum_def: ($) =>
      seq(
        optional("root"),
        choice("enum", "choice"),
        field("name", $.identifier),
        optional($.derivations),
        "{",
        repeat($.enum_member),
        "}"
      ),

    enum_member: ($) =>
      seq(field("name", $.identifier), optional(seq("=", $.integer))),

    // Contract definition
    contract_def: ($) =>
      seq(
        "contract",
        field("name", $.identifier),
        "{",
        repeat($._dto_member),
        "}"
      ),

    // Foreign type definition
    foreign_def: ($) =>
      seq(
        "foreign",
        field("name", $.identifier),
        optional($.derivations),
        "{",
        repeat($.foreign_mapping),
        "}"
      ),

    foreign_mapping: ($) =>
      seq(
        field("target", $.identifier),
        "=",
        $.string_literal,
        optional($.foreign_attrs)
      ),

    foreign_attrs: ($) =>
      seq("with", "{", repeat($.foreign_attr), "}"),

    foreign_attr: ($) =>
      seq($.string_literal, "=", $.string_literal),

    // Service definition
    service_def: ($) =>
      seq(
        optional("root"),
        "service",
        field("name", $.identifier),
        "{",
        repeat($.method_def),
        "}"
      ),

    method_def: ($) =>
      seq("def", field("name", $.identifier), "(", repeat($._method_part), ")"),

    _method_part: ($) =>
      choice($.method_type_ref, $.method_inline_def),

    method_type_ref: ($) =>
      seq(field("marker", choice("in", "out", "err")), "=", $.type_ref),

    method_inline_def: ($) =>
      seq(
        choice("data", "adt", "enum"),
        field("marker", choice("in", "out", "err")),
        "{",
        repeat($._dto_member),
        "}"
      ),

    // Namespace definition
    namespace_def: ($) =>
      seq(
        "ns",
        field("name", $.identifier),
        "{",
        repeat(choice($.include_decl, $._definition)),
        "}"
      ),

    // DTO members
    _dto_member: ($) =>
      choice(
        $.field_def,
        $.parent_def,
        $.unparent_def,
        $.intersection_def,
        $.contract_ref
      ),

    field_def: ($) =>
      seq(field("name", $.identifier), ":", field("type", $.type_ref)),

    parent_def: ($) => seq("+", $.type_ref),

    unparent_def: ($) =>
      seq("-", choice($.type_ref, $.field_def)),

    intersection_def: ($) => seq("^", $.type_ref),

    contract_ref: ($) => seq("is", $.type_ref),

    contract_refs: ($) => repeat1($.contract_ref),

    // Derivations
    derivations: ($) => seq(":", commaSep1($._derivation)),

    _derivation: ($) => choice($.derived, $.was),

    derived: ($) => seq("derived", "[", $.identifier, "]"),

    was: ($) => seq("was", "[", $.type_ref, "]"),

    // Types
    type_ref: ($) =>
      choice(
        $.generic_type,
        $.scoped_identifier,
        $.builtin_type
      ),

    generic_type: ($) =>
      seq(
        field("name", choice($.scoped_identifier, $.builtin_type)),
        "[",
        commaSep1($.type_ref),
        "]"
      ),

    scoped_identifier: ($) => sep1($.identifier, "."),

    builtin_type: ($) =>
      choice(
        // Integer types
        "i08",
        "i16",
        "i32",
        "i64",
        "u08",
        "u16",
        "u32",
        "u64",
        // Float types
        "f32",
        "f64",
        "f128",
        // Other primitives
        "str",
        "bytes",
        "uid",
        "bit",
        "tso",
        "tsu",
        // Generic constructors
        "opt",
        "lst",
        "set",
        "map"
      ),

    // Literals
    string_literal: ($) =>
      seq('"', repeat(choice($.escape_sequence, /[^"\\]+/)), '"'),

    escape_sequence: ($) =>
      token.immediate(
        seq("\\", choice(/[\\'"nrt0]/, /x[0-9a-fA-F]{2}/, /u[0-9a-fA-F]{4}/))
      ),

    integer: ($) => choice($.decimal_integer, $.hex_integer),

    decimal_integer: ($) => token(seq(optional("-"), /[0-9]+/)),

    hex_integer: ($) => token(seq(optional("-"), /0[xX][0-9a-fA-F]+/)),

    // Identifier
    identifier: ($) => /[a-zA-Z_$][a-zA-Z0-9_]*/,

    // Comments
    comment: ($) => token(seq("//", /.*/)),

    block_comment: ($) =>
      token(seq("/*", /[^*]*\*+([^/*][^*]*\*+)*/, "/")),
  },
});

/**
 * Creates a rule to match one or more occurrences separated by a comma.
 */
function commaSep1(rule) {
  return seq(rule, repeat(seq(",", rule)));
}

/**
 * Creates a rule to match one or more occurrences separated by a separator.
 */
function sep1(rule, separator) {
  return seq(rule, repeat(seq(separator, rule)));
}
