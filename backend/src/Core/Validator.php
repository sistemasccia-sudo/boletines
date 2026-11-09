<?php

declare(strict_types=1);

namespace App\Core;

/**
 * Validación declarativa de inputs: lanza HttpException 422 con `fields`.
 *
 * Reglas: required, nullable, max:N, min:N, date (AAAA-MM-DD),
 * in:a,b,c, decimal:N (hasta N decimales), positive (mayor a cero),
 * regex:/…/.
 */
final class Validator
{
    /**
     * @param array<string, mixed> $input
     * @param array<string, array{rules: string, label?: string}> $schema
     */
    public static function check(array $input, array $schema): void
    {
        $fields = [];

        foreach ($schema as $field => $definition) {
            $label = $definition['label'] ?? $field;
            $rules = explode('|', $definition['rules']);
            $required = in_array('required', $rules, true);

            $value = $input[$field] ?? null;
            if (is_string($value)) {
                $value = trim($value);
            }

            if ($value === null || $value === '') {
                if ($required) {
                    $fields[$field] = $label . ' es obligatorio.';
                }
                continue;
            }

            foreach ($rules as $rule) {
                if ($rule === 'required' || $rule === 'nullable') {
                    continue;
                }
                [$name, $argument] = array_pad(explode(':', $rule, 2), 2, null);
                $message = self::applyRule($name, (string) $argument, $value, $label);
                if ($message !== null && !isset($fields[$field])) {
                    $fields[$field] = $message;
                }
            }
        }

        if ($fields !== []) {
            throw new HttpException(422, 'Datos inválidos', $fields);
        }
    }

    private static function applyRule(string $name, string $argument, mixed $value, string $label): ?string
    {
        switch ($name) {
            case 'max':
                if (is_string($value) && mb_strlen($value) > (int) $argument) {
                    return $label . ' no debe superar ' . $argument . ' caracteres.';
                }
                break;
            case 'min':
                if (is_string($value) && mb_strlen($value) < (int) $argument) {
                    return $label . ' debe tener al menos ' . $argument . ' caracteres.';
                }
                break;
            case 'in':
                if (!in_array((string) $value, explode(',', $argument), true)) {
                    return $label . ' tiene un valor no permitido.';
                }
                break;
            case 'date':
                if (preg_match('/^\d{4}-\d{2}-\d{2}$/', (string) $value) !== 1) {
                    return $label . ' debe ser una fecha válida (AAAA-MM-DD).';
                }
                [$year, $month, $day] = array_map('intval', explode('-', (string) $value));
                if (!checkdate($month, $day, $year)) {
                    return $label . ' debe ser una fecha válida (AAAA-MM-DD).';
                }
                break;
            case 'decimal':
                $decimals = $argument === '' ? 4 : (int) $argument;
                if (preg_match('/^\d{1,10}(\.\d{1,' . $decimals . '})?$/', (string) $value) !== 1) {
                    return $label . ' debe ser un número con hasta ' . $decimals . ' decimales.';
                }
                break;
            case 'positive':
                if (!is_numeric($value) || (float) $value <= 0) {
                    return $label . ' debe ser mayor a cero.';
                }
                break;
            case 'regex':
                if (preg_match($argument, (string) $value) !== 1) {
                    return $label . ' tiene un formato no válido.';
                }
                break;
        }

        return null;
    }

    private function __construct()
    {
    }
}
