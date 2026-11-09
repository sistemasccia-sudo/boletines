<?php

declare(strict_types=1);

namespace App\Core;

use HTMLPurifier;
use HTMLPurifier_Config;

/**
 * Sanitiza el HTML del editor con la lista blanca de AGENTS.md:
 * p, br, strong, em, u, s, h2–h4, ul, ol, li, blockquote,
 * a (href/target/rel), img (src/alt) y tablas.
 * Elimina script, style, atributos on* y URLs javascript:/data:.
 */
final class HtmlSanitizer
{
    private static ?HTMLPurifier $purifier = null;

    public static function purify(string $html): string
    {
        if (self::$purifier === null) {
            $config = HTMLPurifier_Config::createDefault();
            $config->set(
                'HTML.Allowed',
                'p,br,strong,em,u,s,h2,h3,h4,ul,ol,li,blockquote,a[href|target|rel],img[src|alt],table,thead,tbody,tr,th,td'
            );
            $config->set('Core.Encoding', 'UTF-8');
            // Solo http/https/mailto: bloquea data:, javascript:, etc.
            $config->set('URI.AllowedSchemes', ['http' => true, 'https' => true, 'mailto' => true]);
            // Los enlaces abren en pestaña nueva con rel seguro.
            $config->set('HTML.TargetBlank', true);
            $config->set('HTML.TargetNoreferrer', true);
            $config->set('HTML.TargetNoopener', true);
            $config->set('Attr.AllowedFrameTargets', ['_blank']);
            $config->set('AutoFormat.RemoveEmpty', true);

            self::$purifier = new HTMLPurifier($config);
        }

        return self::$purifier->purify($html);
    }

    private function __construct()
    {
    }
}
