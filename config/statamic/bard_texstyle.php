<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Styles
    |--------------------------------------------------------------------------
    |
    | Restored from Statamic 2 Redactor formattingAdd (system.yaml) / CP menu:
    | Header 2 Orange, Header 3 Orange, Tag Word.
    | Native Bard supplies Normal text, Header 2, Header 3.
    | (Quote / ee-lb-btn omitted — unused in migrated content.)
    |
    */

    'styles' => [

        'h2_orange' => [
            'type' => 'heading_2',
            'name' => 'Header 2 Orange',
            'ident' => '2',
            // Same paths as Statamic h2.svg with brand stroke (Tailwind can't override)
            'icon' => '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 14 14"><defs><clipPath id="ah-h2o"><path d="M0 0h14v14H0z" fill="none"/></clipPath></defs><g clip-path="url(#ah-h2o)"><path d="M12.93 12.75H9.61V12c0-.53.29-1 .74-1.22l1.84-.86c.44-.21.73-.67.73-1.18 0-.71-.54-1.29-1.21-1.29h-.86c-.54 0-1 .37-1.17.88M1 12.75V1.25m5.75 0v11.5M1 6.52h5.75" fill="none" stroke="#FF551E" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"/></g></svg>',
            'class' => 'orange',
            'cp_css' => 'font-size: 24px; line-height: 1.2; font-weight: 400; color: #FF551E;',
            'cp_badge' => false,
        ],

        'h3_orange' => [
            'type' => 'heading_3',
            'name' => 'Header 3 Orange',
            'ident' => '3',
            'icon' => '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 14 14"><defs><clipPath id="ah-h3o"><path d="M0 0h14v14H0z" fill="none"/></clipPath></defs><g clip-path="url(#ah-h3o)"><path d="M9.54 11.87c.18.52.67.88 1.25.88h.88c.73 0 1.33-.59 1.33-1.33v-.22c0-.73-.59-1.33-1.33-1.33h-.44.33c.67 0 1.22-.54 1.22-1.22s-.54-1.22-1.22-1.22h-.66c-.56 0-1.03.37-1.17.88M1 12.75V1.25m5.75 0v11.5M1 6.52h5.75" fill="none" stroke="#FF551E" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"/></g></svg>',
            'class' => 'orange',
            'cp_css' => 'font-size: 16px; line-height: 1; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: #FF551E;',
            'cp_badge' => false,
        ],

        'tag_word' => [
            'type' => 'span',
            'name' => 'Tag Word',
            'ident' => 'T',
            'icon' => 'square',
            'class' => 'tag-word',
            'cp_css' => 'font-size: 16px; line-height: 1; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em;',
            'cp_badge' => false,
        ],

    ],

    'pins' => [],

    'pins_path' => 'partials/pins',

    'attributes' => [],

    /*
    |--------------------------------------------------------------------------
    | Defaults — CP preview for unstyled h2 / h3 (plain Header 2 / Header 3)
    |--------------------------------------------------------------------------
    */

    'defaults' => [

        'heading_2' => [
            'cp_css' => 'font-size: 24px; line-height: 1.2; font-weight: 400;',
            'cp_badge' => false,
        ],

        'heading_3' => [
            'cp_css' => 'font-size: 16px; line-height: 1; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em;',
            'cp_badge' => false,
        ],

    ],

    // Match migrated HTML: class="orange", class="tag-word", class="ee-lb-btn"
    'store' => 'class',

];
