<?php

function generator_range(int $start, int $end, int $step = 1)
{
    for ($i = $start; $i < $end; $i = $i + $step) {
        yield ($i);
    }
}

$results = generator_range(1, 10, 5);

/**
 * @param string $haystack
 * @param string|string[] $needle
 * 
 * @return bool
 */
function starts_with($haystack, $needles)
{
    foreach ((array) $needles as $needle) {
        // Annotations will be used in function calls within expressions
        if ($needle !== '' && substr($haystack, 0, strlen($needle)) === (string) $needle) {
            return true;
        }
    }

    return false;
}

starts_with('foo', 'It uses the docblock name, not the actual parameter name');

undefined_functions('will', 'have', 'no', 'parameter', 'names');

function test(string $test)
{
}
test('Functions called with a single parameter can have the annotations hidden by a setting');

echo test('Annotations will be used in statements');

var_dump('Foo', 'Bar', 'Language constructs with improper descriptions will not have variadic annotations');

test('Foo') or die('Language constructs that do not have descriptions will not have annotations');

$array = [
    strtolower('Foo'),
    'Foo' => strtoupper('Bar'),
    strtolower('Foo') => strtoupper('Bar'),
];

function variadic($a, $b, ...$c)
{
}
variadic('a', 'b', 'c', 'd', 'e', 'f', 'g');

class Example
{
    public function __construct($one)
    {
        $this->one('one');
    }

    public function one($one)
    {
    }
    public function two($two)
    {
    }
}

$example = new Example(1);
$example->two(2);

if ($example === !is_null($example)) {
}

$ternary = is_null($example) ? strtoupper($a) : strtolower($b);

$expression = 'Variables passed that match the name of the parameter name can be hidden with a setting';
var_dump($expression);
