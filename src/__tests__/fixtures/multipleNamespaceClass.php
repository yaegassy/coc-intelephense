<?php

declare(strict_types=1);

namespace App\Dummy;

use App\Dummy\Logger;

class Sample1
{
    private ?int $id;

    private string $name = '';

    /**
     * @var string
     */
    private $description;

    private string|null $dummyCode = '';

    private ?\DateTimeInterface $dummyDate = null;

    /**
     * @var ?string|\DateTimeInterface $multi1
     * @var int $multi2
     */
    private $dummyMulti1, $dummyMulti2;

    public function __construct(
        public int $prop1 = 0,
        public array $prop2 = [],
    ) {
    }

    public function hello()
    {
    }
}

class Sample2
{
    private int $increment;

    public function example()
    {
    }
}
